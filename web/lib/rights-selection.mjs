export function getUserSelection(selection, userId, assignedIds) {
  return selection?.userId === userId ? selection.ids : assignedIds;
}

export function getModuleSelectionState(rightIds, selectedIds) {
  const selectedCount = rightIds.filter((rightId) => selectedIds.has(rightId)).length;
  return {
    checked: rightIds.length > 0 && selectedCount === rightIds.length,
    indeterminate: selectedCount > 0 && selectedCount < rightIds.length,
  };
}

export function updateRightSelection(currentIds, rightIds, checked) {
  const next = new Set(currentIds);
  for (const rightId of rightIds) {
    if (checked) next.add(rightId);
    else next.delete(rightId);
  }
  return next;
}
