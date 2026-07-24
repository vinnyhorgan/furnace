Module.preRun = Module.preRun || [];
Module.preRun.push(() => {
  const home = '/home/web_user';
  FS.mkdirTree(home);
  FS.mount(IDBFS, {}, home);
  addRunDependency('kri-idbfs');
  FS.syncfs(true, (error) => {
    if (error) console.error('could not load kri browser storage:', error);
    let syncInFlight = false;
    let syncQueued = false;
    Module.kriSyncStorage = () => {
      if (syncInFlight) {
        syncQueued = true;
        return;
      }
      syncInFlight = true;
      FS.syncfs(false, (syncError) => {
        syncInFlight = false;
        if (syncError) console.error('could not save kri browser storage:', syncError);
        if (syncQueued) {
          syncQueued = false;
          Module.kriSyncStorage();
        }
      });
    };
    Module.furnaceSyncTimer = window.setInterval(Module.kriSyncStorage, 5000);
    removeRunDependency('kri-idbfs');
  });
});
