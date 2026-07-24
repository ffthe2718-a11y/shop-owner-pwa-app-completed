import React, { useState } from 'react';
import { 
  CheckCircle2, Trash2, X, CheckSquare, Square, ChevronDown, Sparkles, AlertTriangle 
} from 'lucide-react';

export interface StatusOption {
  label: string;
  value: string;
  color?: 'emerald' | 'amber' | 'blue' | 'purple' | 'slate' | 'red';
  icon?: React.ReactNode;
}

export interface StickyBulkActionBarProps {
  selectedCount: number;
  totalCount?: number;
  itemLabel?: string; // e.g. "service", "customer", "staff", "booking"
  onClearSelection: () => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  statusOptions?: StatusOption[];
  onStatusUpdate?: (statusValue: string) => void;
  onDelete?: () => void;
  customActions?: React.ReactNode;
  deleteLabel?: string;
}

export default function StickyBulkActionBar({
  selectedCount,
  totalCount,
  itemLabel = 'item',
  onClearSelection,
  onSelectAll,
  isAllSelected,
  statusOptions = [],
  onStatusUpdate,
  onDelete,
  customActions,
  deleteLabel = 'Delete Selected'
}: StickyBulkActionBarProps) {
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  if (selectedCount === 0) return null;

  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-emerald-500/40',
    amber: 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border-amber-500/40',
    blue: 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border-blue-500/40',
    purple: 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border-purple-500/40',
    slate: 'bg-slate-700 text-slate-300 hover:bg-slate-600 border-slate-600',
    red: 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border-red-500/40',
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-3xl pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300 ease-out">
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 shadow-2xl rounded-2xl p-3 md:p-3.5 flex flex-wrap items-center justify-between gap-3">
        
        {/* Left Info & Select All */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-blue-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs">
            <span className="bg-white text-blue-700 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-extrabold">
              {selectedCount}
            </span>
            <span>{itemLabel}{selectedCount > 1 ? 's' : ''} selected</span>
          </div>

          {onSelectAll && typeof totalCount === 'number' && (
            <button
              type="button"
              onClick={onSelectAll}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              {isAllSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>Select All ({totalCount})</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Right Actions: Status Update + Delete + Custom Actions + Close */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Custom Action Slots */}
          {customActions}

          {/* Status Update Button & Dropdown */}
          {statusOptions.length > 0 && onStatusUpdate && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 text-white text-xs font-semibold rounded-xl border border-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Status Update</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Status Menu Popover */}
              {isStatusDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsStatusDropdownOpen(false)} 
                  />
                  <div className="absolute bottom-full right-0 mb-2 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700/60 mb-1">
                      Change Status To
                    </div>
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onStatusUpdate(option.value);
                          setIsStatusDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700/70 hover:text-white flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          {option.icon || <Sparkles className="w-3.5 h-3.5 text-blue-400" />}
                          {option.label}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${colorClasses[option.color || 'blue']}`}>
                          Apply
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Delete Button */}
          {onDelete && (
            <div className="relative">
              {isDeleteConfirmOpen ? (
                <div className="flex items-center gap-1.5 bg-red-950/90 border border-red-800/80 rounded-xl p-1 animate-in fade-in zoom-in-95">
                  <span className="text-[11px] text-red-200 px-1 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-400" /> Confirm?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete();
                      setIsDeleteConfirmOpen(false);
                    }}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    className="px-2 py-1 text-slate-400 hover:text-white text-xs font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600/90 hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deleteLabel}</span>
                </button>
              )}
            </div>
          )}

          {/* Clear / Dismiss */}
          <div className="h-4 w-px bg-slate-700 mx-0.5 hidden sm:block" />
          
          <button
            type="button"
            onClick={onClearSelection}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Deselect All"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
