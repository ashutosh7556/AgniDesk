import { customerStore, serviceStore } from '../storage/stores.js';
import { NUMBER_PREFIX, REMINDER_WINDOW_DAYS } from '../config/business.js';
import { ApiError } from '../utils/ApiError.js';
import { matchesSearch, paginate } from '../utils/listing.js';
import { todayIST } from '../utils/dates.js';
import { nextDocumentNumber } from './billingDocument.service.js';

/**
 * Fire safety service visits ("service records" — named to avoid confusion
 * with the code-level "services" folder).
 *
 * Status flow: scheduled -> completed | cancelled. Completing a service issues
 * a certificate number (CERT/2026-27/0001), assigned inside the file lock.
 * A completed service can be edited but not reverted or deleted, because its
 * certificate may already have been given to the customer.
 */

const SEARCH_FIELDS = ['customerName', 'serviceType', 'certificateNumber', 'technician', 'siteAddress'];

const addDays = (iso, days) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (fromIso, toIso) =>
  Math.round((new Date(`${toIso}T00:00:00Z`) - new Date(`${fromIso}T00:00:00Z`)) / 86_400_000);

const byServiceDateDesc = (a, b) =>
  b.serviceDate.localeCompare(a.serviceDate) || (b.createdAt ?? '').localeCompare(a.createdAt ?? '');

const validationError = (field, message) => new ApiError(400, 'Please correct the highlighted fields.', [{ field, message }]);

/** Certificate numbers restart each financial year, like invoices. */
const nextCertificateNumber = (rows, serviceDate) =>
  nextDocumentNumber(
    rows.map((r) => ({ number: r.certificateNumber })),
    NUMBER_PREFIX.certificate,
    serviceDate,
  );

async function customerSnapshot(customerId) {
  const customer = await customerStore.findById(customerId);
  if (!customer) throw validationError('customerId', 'The selected customer no longer exists.');
  return {
    customerName: customer.name,
    customer: {
      id: customer.id,
      name: customer.name,
      companyName: customer.companyName,
      mobile: customer.mobile,
      email: customer.email,
      address: customer.address,
      gstNumber: customer.gstNumber,
    },
  };
}

/**
 * A completed service is "followed up" once a newer, non-cancelled service of
 * the same type exists for the same customer — its reminder then disappears.
 */
function followedUpIds(services) {
  const ids = new Set();
  for (const s of services) {
    if (s.status !== 'completed' || !s.nextDueDate) continue;
    const hasNewer = services.some(
      (other) =>
        other.id !== s.id &&
        other.status !== 'cancelled' &&
        other.customerId === s.customerId &&
        other.serviceType === s.serviceType &&
        (other.serviceDate > s.serviceDate ||
          (other.serviceDate === s.serviceDate && (other.createdAt ?? '') > (s.createdAt ?? ''))),
    );
    if (hasNewer) ids.add(s.id);
  }
  return ids;
}

/**
 * Upcoming work: completed services whose next due date falls within the
 * reminder window (or is overdue) and scheduled visits in the same window.
 */
export function buildReminders(services, today = todayIST(), windowDays = REMINDER_WINDOW_DAYS) {
  const horizon = addDays(today, windowDays);
  const followedUp = followedUpIds(services);
  const reminders = [];

  for (const s of services) {
    if (s.status === 'completed' && s.nextDueDate && !followedUp.has(s.id) && s.nextDueDate <= horizon) {
      reminders.push({ kind: 'due', date: s.nextDueDate, service: s });
    } else if (s.status === 'scheduled' && s.serviceDate <= horizon) {
      reminders.push({ kind: 'scheduled', date: s.serviceDate, service: s });
    }
  }

  return reminders
    .map(({ kind, date, service }) => ({
      kind,
      date,
      daysLeft: daysBetween(today, date),
      serviceId: service.id,
      customerId: service.customerId,
      customerName: service.customerName,
      customerMobile: service.customer?.mobile ?? '',
      serviceType: service.serviceType,
      equipmentSummary: (service.equipment ?? []).map((e) => `${e.name} × ${e.quantity}`).join(', '),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const toListItem = ({ equipment, customer, ...rest }) => ({ ...rest, equipmentCount: equipment?.length ?? 0 });

export async function listServices({ search, customerId, status, serviceType, page, limit }) {
  const services = await serviceStore.findAll();
  const today = todayIST();
  const monthStart = `${today.slice(0, 7)}-01`;

  const filtered = services
    .filter((s) => !customerId || s.customerId === customerId)
    .filter((s) => !status || s.status === status)
    .filter((s) => !serviceType || s.serviceType === serviceType)
    .filter((s) => matchesSearch(s, SEARCH_FIELDS, search))
    .sort(byServiceDateDesc)
    .map(toListItem);

  const reminders = buildReminders(customerId ? services.filter((s) => s.customerId === customerId) : services, today);
  const summary = {
    overdue: reminders.filter((r) => r.daysLeft < 0).length,
    dueSoon: reminders.filter((r) => r.daysLeft >= 0).length,
    scheduled: services.filter((s) => s.status === 'scheduled').length,
    completedThisMonth: services.filter((s) => s.status === 'completed' && s.serviceDate >= monthStart && s.serviceDate <= today).length,
  };

  return { ...paginate(filtered, { page, limit }), summary };
}

export async function listReminders({ windowDays = REMINDER_WINDOW_DAYS } = {}) {
  return buildReminders(await serviceStore.findAll(), todayIST(), windowDays);
}

export async function getService(id) {
  const service = await serviceStore.findById(id);
  if (!service) throw new ApiError(404, 'Service record not found.');
  return service;
}

export async function createService(input) {
  const snapshot = await customerSnapshot(input.customerId);
  return serviceStore.create((rows) => ({
    ...input,
    ...snapshot,
    siteAddress: input.siteAddress || snapshot.customer.address,
    ...(input.status === 'completed'
      ? { certificateNumber: nextCertificateNumber(rows, input.serviceDate), completedAt: new Date().toISOString() }
      : { certificateNumber: '', completedAt: '' }),
  }));
}

export async function updateService(id, input) {
  const existing = await getService(id);
  if (existing.status === 'completed' && input.status !== 'completed') {
    throw validationError('status', 'A completed service cannot be changed back. Its certificate may already be issued.');
  }
  const snapshot = await customerSnapshot(input.customerId);

  return serviceStore.update(id, (current, rows) => {
    const becomesCompleted = input.status === 'completed' && !current.certificateNumber;
    return {
      ...input,
      ...snapshot,
      siteAddress: input.siteAddress || snapshot.customer.address,
      ...(becomesCompleted
        ? { certificateNumber: nextCertificateNumber(rows, input.serviceDate), completedAt: new Date().toISOString() }
        : {}),
    };
  });
}

/** Quick action from the list/detail page. */
export async function completeService(id) {
  const existing = await getService(id);
  if (existing.status === 'completed') throw new ApiError(409, 'Service is already completed.');
  if (existing.status === 'cancelled') throw new ApiError(409, 'Cancelled services cannot be completed. Edit the status first.');
  return serviceStore.update(id, (current, rows) => ({
    status: 'completed',
    certificateNumber: nextCertificateNumber(rows, current.serviceDate),
    completedAt: new Date().toISOString(),
  }));
}

export async function deleteService(id) {
  const existing = await getService(id);
  if (existing.certificateNumber) {
    throw new ApiError(409, `Certificate ${existing.certificateNumber} has been issued for this service, so it cannot be deleted.`);
  }
  await serviceStore.delete(id);
}
