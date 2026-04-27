/**
 * Shared logic for the Aktivacity dashboard.
 * Handles filtering, search, and dynamic data updates.
 */

window.FilterState = {
  search: '',
  department: 'Any',
  status: 'Any',
  priority: 'Any',
  assignee: 'Any'
};

/**
 * Filters the TASKS array based on current FilterState.
 */
window.getFilteredTasks = function() {
  return TASKS.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(FilterState.search.toLowerCase()) ||
                          t.owner.toLowerCase().includes(FilterState.search.toLowerCase());
    
    const matchesDept = FilterState.department === 'Any' ||
                        (t.department || '').toLowerCase() === FilterState.department.toLowerCase();
    
    // Status Logic
    let matchesStatus = true;
    if (FilterState.status !== 'Any') {
        if (FilterState.status === 'Overdue') {
            matchesStatus = t.status === 'overdue';
        } else if (FilterState.status === 'Completed') {
            matchesStatus = t.status === 'completed';
        }
    }
    
    const matchesPrio = FilterState.priority === 'Any' || t.prio === FilterState.priority.toLowerCase();
    
    const matchesAssignee = FilterState.assignee === 'Any' || t.owner === FilterState.assignee;

    return matchesSearch && matchesStatus && matchesPrio && matchesAssignee;
  });
};

/**
 * Utility to debounce search input.
 */
window.debounce = function(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { func.apply(this, args); }, timeout);
  };
};

/**
 * Updates a filter and triggers a re-render.
 */
window.setFilter = function(key, value, renderCallback) {
  FilterState[key] = value;
  if (renderCallback) renderCallback();
};
