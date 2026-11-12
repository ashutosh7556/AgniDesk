/**
 * Serialises async work per key (here: per workbook file path).
 *
 * Every write to a workbook is read-modify-write. Without a lock, two
 * concurrent requests could both read the old file and the second write
 * would silently drop the first one's change. Callers for the same key
 * run strictly one after another; different keys run in parallel.
 *
 * NOTE: this is an in-process lock. Run exactly ONE backend process
 * (no cluster mode / multiple instances) while Excel is the data store.
 */
export class KeyedMutex {
  #tails = new Map();

  async run(key, task) {
    const previous = this.#tails.get(key) ?? Promise.resolve();
    let release;
    const current = new Promise((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => current);
    this.#tails.set(key, tail);

    await previous;
    try {
      return await task();
    } finally {
      release();
      if (this.#tails.get(key) === tail) this.#tails.delete(key);
    }
  }
}
