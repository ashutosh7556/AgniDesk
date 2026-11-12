import { useContext } from 'react';
import { SettingsContext } from '../context/SettingsContext.jsx';

/** const { settings, setSettings, reload } = useSettings(); */
export const useSettings = () => useContext(SettingsContext);

/** "Regards, <business>\n<phone>" signature for WhatsApp messages. */
export const messageSignature = (settings) => `\n\nRegards,\n${settings.businessName}\n${settings.phone1}`;
