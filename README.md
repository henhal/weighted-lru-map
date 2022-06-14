# weighted-lru-map
A LRU map supporting eviction based on calculated item weight in addition to the item count.

## Introduction

This is an extension of the [lru_map](https://www.npmjs.com/package/lru_map) NPM module, adding support for cache eviction based on item weight, in addition to the limit on the item count.
The weight of each item is calculated by a `getWeight` function supplied to the `WeightedLruMap` constructor.

This allows effecient LRU caching of items where the size varies significantly. With a traditional LRU map using only item count
as the eviction criteria, adding 20 small items or 20 huge items would render the same number of evictions, making it
hard to predict the RAM usage of a cache allowing 1 000 items of unknown size.
With a `WeightedLruMap`, eviction can be set up to occur based on approximate memory usage, gaining more control over
eviction and perhaps thereby allowing larger caches with better hit rate without risking out of memory.

## Installation

```
$ npm install 'weighted-lru-map';
```

## Examples:

### Cache of arrays with length of each array as the weight
   
It's a good idea to avoid weights of zero, otherwise the map may theoretically contain an infinte number of 
empty arrays. 
For array elements this could be achieved using e.g. `value.length + 1` or `value.length || 1`.
```
import {WeightedLruMap} from 'weighted-lru-map';

/**
 * Create a LRU map storing string arrays as values, 
 * where the item weight is the length of each array
 */
const map = new WeightedLruMap<number, string[]>(value => value.length || 1, 10);

map.set(1, ['A', 'B', 'C', 'D']); // weight is now 4
map.set(2, ['E', 'F']); // weight is now 6
map.set(3, ['G', 'H']); // weight is now 8
map.set(4, ['I', 'J', 'K', 'L']); // weight became 12, evicted item 1 to reach weight 8
map.set(5, []); // weight is now 9 (empty array has weight 1)
map.set(6, ['N', 'O', 'P', 'Q']); // weight became 13, evicted items 2 and 3 to 
                                  // reach weight 9
```

### Cache of objects with the approximate memory usage as the weight

Using JSON representation used as the approximate size of objects:
```
import {WeightedLruMap} from 'weighted-lru-map';

/**
 * Create a LRU map storing arbitrary objects, where the item weight is the length of 
 * the JSON representation of each item
 */
const map = new WeightedLruMap<number, any>(value => JSON.stringify(value)?.length || 1, 50);

map.set(1, {foo: 42}); // weight is now 10 (length of '{"foo":42}')
map.set(2, {foo: 43}); // weight is now 20
map.set(3, {foo: 44}); // weight is now 30
map.set(4, {foo: 45, bar: 'awesome!', hello: 'world!'}); // weight became 74, evicting 
                                                         // items 1, 2 and 3 to reach weight 44
...
```