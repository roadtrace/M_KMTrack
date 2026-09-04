(function(root, factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  if(root) root.KMTrackEntryFilters = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  'use strict';
  // Keep the saved local calendar day, without converting it to UTC.
  function entryDay(entry){ return String(entry.timestamp || '').slice(0,10); }
  function filterEntries(entries, {day = '', type = ''} = {}){
    return entries.filter(entry => (!day || entryDay(entry) === day) && (!type || entry.type === type));
  }
  function exportScope(entries, filters = {}, selectedIds = new Set()){
    const visible = filterEntries(entries, filters);
    const selected = visible.filter(entry => selectedIds.has(entry.id));
    return {
      entries: selected.length ? selected : visible,
      restricted: Boolean(selected.length || filters.day || filters.type)
    };
  }
  function mapEntries(entries, day = ''){
    return filterEntries(entries, {day}).filter(entry =>
      Number.isFinite(entry.lat) && Math.abs(entry.lat) <= 90 &&
      Number.isFinite(entry.lon) && Math.abs(entry.lon) <= 180);
  }
  return {entryDay, filterEntries, exportScope, mapEntries};
});
