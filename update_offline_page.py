import re

file_path = 'src/pages/owner/OwnerOfflinePage.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# 1. Add Import
import_statement = "import { getOwnerOfflineStorageEstimate, type StorageEstimate } from '../../lib/ownerOfflineStorageManager';\n"
if "getOwnerOfflineStorageEstimate" not in content:
    content = content.replace("import type { OwnerPendingAction } from '../../types/ownerOffline';", 
                             "import type { OwnerPendingAction } from '../../types/ownerOffline';\n" + import_statement)

# 2. Add State
state_decl = "  const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null);\n"
if "const [storageEstimate" not in content:
    content = content.replace("  const [exportSuccess, setExportSuccess] = useState(false);",
                             "  const [exportSuccess, setExportSuccess] = useState(false);\n" + state_decl)

# 3. Update loadPending
load_pending_search = """        const actions = await getPendingOwnerActions(ownerId, shopId);
        if (isMounted) {
          setPendingActions(actions);
        }"""
load_pending_replace = """        const actions = await getPendingOwnerActions(ownerId, shopId);
        const estimate = await getOwnerOfflineStorageEstimate();
        if (isMounted) {
          setPendingActions(actions);
          setStorageEstimate(estimate);
        }"""
content = content.replace(load_pending_search, load_pending_replace)

# 4. Replace Indicator UI
indicator_search = """              {/* Local Storage Usage Indicator */}
              <div id="offline-storage-usage-container" className="mt-3 pt-3 border-t border-slate-200/60">
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="font-semibold text-slate-500">Queue Storage Footprint</span>
                  <span className="font-bold text-slate-700 tabular-nums">
                    {isLoadingActions ? 'Calculating...' : formatBytes(queueSizeBytes)}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-full overflow-hidden flex">
                  <div
                    id="offline-storage-progress-bar"
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${usagePercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-400 mt-1">
                  <span>Quota: 5.0 MB</span>
                  <span>{isLoadingActions ? '0%' : `${usagePercentage.toFixed(3)}% used`}</span>
                </div>
              </div>"""

indicator_replace = """              {/* Local Storage Usage Indicator */}
              <div id="offline-storage-usage-container" className="mt-3 pt-3 border-t border-slate-200/60">
                {storageEstimate?.quota ? (
                  <>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-semibold text-slate-500">Offline storage used</span>
                      <span className="font-bold text-slate-700 tabular-nums">
                        {isLoadingActions ? 'Calculating...' : `${formatBytes(storageEstimate.usage)} of ${formatBytes(storageEstimate.quota)}`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200/80 dark:bg-slate-800/80 rounded-full overflow-hidden flex">
                      <div
                        id="offline-storage-progress-bar"
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0.1, (storageEstimate.usage / storageEstimate.quota) * 100))}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-start justify-center text-[11px] text-slate-500">
                     <span className="font-semibold mb-0.5">Offline data saved for faster access</span>
                     <span className="text-[10px]">Storage usage details are not available on this browser.</span>
                  </div>
                )}
              </div>"""

content = content.replace(indicator_search, indicator_replace)

with open(file_path, 'w') as f:
    f.write(content)

print("Updated OwnerOfflinePage.tsx")
