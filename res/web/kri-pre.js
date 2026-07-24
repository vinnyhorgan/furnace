Module.preRun = Module.preRun || [];
Module.preRun.push(() => {
  const home = '/home/web_user';
  FS.mkdirTree(home);
  FS.mount(IDBFS, {}, home);
  addRunDependency('kri-idbfs');
  FS.syncfs(true, (error) => {
    if (error) console.error('could not load kri browser storage:', error);
    Module.furnaceSyncTimer = window.setInterval(() => {
      FS.syncfs(false, (syncError) => {
        if (syncError) console.error('could not save kri browser storage:', syncError);
      });
    }, 5000);
    removeRunDependency('kri-idbfs');
  });
});
