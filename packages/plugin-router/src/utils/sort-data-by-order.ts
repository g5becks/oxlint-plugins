export function sortDataByOrder<T, TKey extends keyof T>(
  data: ReadonlyArray<T>,
  orderRules: ReadonlyArray<Readonly<[ReadonlyArray<T[TKey]>, ReadonlyArray<T[TKey]>]>>,
  key: TKey,
): Array<T> | null {
  const getSubsetIndex = (item: T[TKey], subsets: ReadonlyArray<ReadonlyArray<T[TKey]>>): number | null => {
    for (let i = 0; i < subsets.length; i += 1) {
      if (subsets[i]?.includes(item)) {
        return i;
      }
    }
    return null;
  };

  const orderSets = orderRules.reduce<Array<ReadonlyArray<T[TKey]>>>((sets, [a, b]) => {
    sets.push(a, b);
    return sets;
  }, []);

  const inOrderArray = data.filter((item) => getSubsetIndex(item[key], orderSets) !== null);
  let wasResorted = false;

  const sortedArray = [...inOrderArray].sort((a, b) => {
    const aSubsetIndex = getSubsetIndex(a[key], orderSets);
    const bSubsetIndex = getSubsetIndex(b[key], orderSets);

    if (aSubsetIndex !== null && bSubsetIndex !== null && aSubsetIndex !== bSubsetIndex) {
      return aSubsetIndex - bSubsetIndex;
    }

    return 0;
  });

  const iterator = sortedArray.values();
  const result = data.map((item) => {
    if (getSubsetIndex(item[key], orderSets) !== null) {
      const sortedItem = iterator.next().value as T;
      if (sortedItem[key] !== item[key]) {
        wasResorted = true;
      }
      return sortedItem;
    }
    return item;
  });

  return wasResorted ? result : null;
}
