Module.preRun = Module.preRun || [];
Module.preRun.push(() => {
  const home = '/home/web_user';
  FS.mkdirTree(home);
  FS.mount(IDBFS, {}, home);
  addRunDependency('furnace-x16-idbfs');
  FS.syncfs(true, (error) => {
    if (error) console.error('Could not load Furnace X16 browser storage:', error);
    Module.furnaceSyncTimer = window.setInterval(() => {
      FS.syncfs(false, (syncError) => {
        if (syncError) console.error('Could not save Furnace X16 browser storage:', syncError);
      });
    }, 5000);
    removeRunDependency('furnace-x16-idbfs');
  });
});
