import {LRUMap} from 'lru_map';

/**
 * A function calculating the weight of a value. It's not recommended to ever use weights of 0.
 */
export type WeightFunction<K, V> = (value: V, key: K) => number;

/**
 * A LRU map with eviction based on the combined item weight in addition to the number of items (=size).
 * The weight of an item is calculated using the getWeight function supplied to the constructor.
 *
 * If no limit is specified, it's set to unlimited, meaning items will be evicted only when the weight surpasses
 * the weight limit, never on the item count.
 * If limit AND weight limit are both specified, eviction will take place whenever size > limit OR
 * weight > weightLimit.
 * Note that multiple items may be evicted on a single insert, as inserting a single heavy item may push out several
 * lighter items.
 */
export default class WeightedLruMap<K, V> extends LRUMap<K, V> {
  private _weight = 0;

  /**
   *
   * @param getWeight A function calculating the weight of an item
   * @param weightLimit The weight limit. When the combined weight surpasses this limit, items are evicted.
   * @param [limit] Limit on the number of items. If absent, no limit is applied.
   * @param [entries] Initial entries
   */
  constructor(
      private readonly getWeight: WeightFunction<K, V>,
      readonly weightLimit: number,
      limit = Number.MAX_VALUE,
      entries?: Iterable<[K,V]>
  ) {
    super(limit, entries);

    if (weightLimit <= 0) {
      throw new Error('Weight limit must be a positive number');
    }
  }

  /**
   * The combined weight of the items in the map
   */
  get weight() {
    return this._weight;
  }

  assign(entries: Iterable<[K, V]>) {
    super.assign(entries);

    this._weight = 0;
    for (const [key, value] of entries) {
      this._weight += this.getWeight(value, key);
    }
  }

  clear() {
    super.clear();

    this._weight = 0;
  }

  delete(key: K): V | undefined {
    const value = super.delete(key);

    if (value !== undefined) {
      this._weight -= this.getWeight(value, key);
    }

    return value;
  }

  set(key: K, value: V): this {
    const itemSize = this.getWeight(value, key);
    const oldValue = this.get(key);
    const oldItemSize = oldValue !== undefined ? this.getWeight(oldValue, key) : 0;

    super.set(key, value);

    this._weight += itemSize - oldItemSize;

    while (this._weight > this.weightLimit) {
      this.shift();
    }

    return this;
  }

  shift(): [K, V] | undefined {
    const entry = super.shift();

    if (entry) {
      const [key, value] = entry;
      this._weight -= this.getWeight(value, key);
    }

    return entry;
  }
}