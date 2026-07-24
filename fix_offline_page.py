import re

file_path = 'src/pages/owner/OwnerOfflinePage.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Add trash icon import
if "Trash2" not in content:
    content = content.replace("Database, FileJson, Check, Activity", "Database, FileJson, Check, Activity, Trash2")

if "clearOwnerShopCache" not in content:
    import_stmt = "import { getOwnerOfflineStorageEstimate, type StorageEstimate, clearOwnerShopCache } from '../../lib/ownerOfflineStorageManager';\n"
    content = content.replace("import { getOwnerOfflineStorageEstimate, type StorageEstimate } from '../../lib/ownerOfflineStorageManager';", import_stmt)
    
if "const [showClearModal, setShowClearModal] = useState(false);" not in content:
    content = content.replace("  const [exportSuccess, setExportSuccess] = useState(false);", 
                             "  const [exportSuccess, setExportSuccess] = useState(false);\n  const [showClearModal, setShowClearModal] = useState(false);\n  const [isClearing, setIsClearing] = useState(false);")

handle_clear_func = """
  const handleClearData = async () => {
    setIsClearing(true);
    try {
      const { ownerId, shopId } = await getActiveOwnerAndShopIds();
      await clearOwnerShopCache(ownerId, shopId);
      const estimate = await getOwnerOfflineStorageEstimate();
      setStorageEstimate(estimate);
    } catch (err) {
      console.error('Failed to clear data', err);
    } finally {
      setIsClearing(false);
      setShowClearModal(false);
    }
  };
"""

if "const handleClearData" not in content:
    content = content.replace("  const queueSizeBytes = getQueueSizeInBytes();", handle_clear_func + "\n  const queueSizeBytes = getQueueSizeInBytes();")

clear_ui = """              </div>

              {/* Clear Offline Data */}
              <div className="mt-4 pt-4 border-t border-slate-200/60">
                <button
                  onClick={() => setShowClearModal(true)}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear saved offline data
                </button>
              </div>"""

content = content.replace("              </div>\n\n              {/* Local Storage Usage Indicator */}", clear_ui + "\n\n              {/* Local Storage Usage Indicator */}")

modal_ui = """        {/* Small status footer text */}
        <p className="text-[11px] text-slate-400 font-medium">
          Live data is unavailable while offline.
        </p>
      </div>

      {showClearModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Clear Offline Data</h3>
            <p className="text-sm text-slate-600 mb-6">
              This will remove saved offline data from this device only. Your live Nexora data will not be deleted.
            </p>
            <div className="flex items-center gap-3 w-full">
              <button
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClearData}
                disabled={isClearing}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isClearing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  'Clear Offline Data'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>"""

content = content.replace("""        {/* Small status footer text */}
        <p className="text-[11px] text-slate-400 font-medium">
          Live data is unavailable while offline.
        </p>
      </div>
    </div>""", modal_ui)


with open(file_path, 'w') as f:
    f.write(content)
print("Updated page with clear button")
