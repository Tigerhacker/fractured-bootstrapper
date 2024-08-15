const patchLevel = 30;

const dataMapping = [
    {
        src: "Fractured Space.exe",
        dest: "spacegame/Binaries/Win64/Fractured Space.exe",
        md5: "1d69840d9a54de7e85ab04cb30608dca",
        sha256: "fa6288c2d914366e14175c1d9ebbb459f6bd605c348b6148e9eea33d7290bc2a",
    },
    {
        src: "ClientConfig.json",
        dest: "spacegame/ClientConfig.json",
        md5: "b169fe7e2d5dd93f3bf0435999530e60",
        sha256: "0087a651ad5fbb235fa438b8d3a3f47cf2f6b11b3f88c528f82c48ccdc8d4b91",
    },
    {
        src: "startgame-script.js",
        dest: "spacegame/Content/UIResources/frontend/views/startgame/startgame-script.js",
        md5: "435fa94c604e9da8498f861fed387cae",
        sha256: "bac58eaa7f06a1b2401e5300e0141739055736bfb66d285e28b0096b83bcc1bb",
    },
    {
        src: "startgame-style.css",
        dest: "spacegame/Content/UIResources/frontend/views/startgame/startgame-style.css",
        md5: "35d7a047452d08cae89feb937ddc2318",
        sha256: "49e856f3667e0c22db18a8c864c62ae66f1e1e2940d0efb783955ea6e0460301",
    },
    {
        src: "gamemodes-config.js",
        dest: "spacegame/Content/UIResources/frontend/views/gamemodes/gamemodes-config.js",
        md5: "c0172d105ffce83915cf6ee4cfbe5370",
        sha256: "d83823a230557be132d5c671da5b5a43ca622ecf29802ac70c3352a106daf074",
    },
	{
        src: "gamemodes-script.js",
        dest: "spacegame/Content/UIResources/frontend/views/gamemodes/gamemodes-script.js",
        md5: "3a6875b5dfe947eb2a8abb11552ced6a",
        sha256: "dd2db52b6a6477834b2ebf99aa1e4dc121822ec09bf9207431c740fe262c9622",
    },
    {
        src: "nsloctext.js",
        dest: "spacegame/Content/UIResources/frontend/data/translations/nsloctext.js",
        md5: "0b93e340ecbe379cabef109b1321e4ce",
        sha256: "c1d43e513deb470d763b5d023db9275d3cde6bb689c45f1da110eb14ddd091af",
    },
    {
        src: "BP.pak",
        dest: "spacegame/Content/Paks/BP.pak",
        md5: "e665df0cdd50a1522799a12c56bbfc6c",
        sha256: "cac460fbce8a33e8f155b9a4abd14c15981156978b3a2d420dc2b468399d1681",
    },
    {
        src: "results-script.js",
        dest: "spacegame/Content/UIResources/frontend/views/results/results-script.js",
        md5: "beef972f8b26a423b625bac8dce203b7",
        sha256: "ace5e5197f6779efd46531c0f08c6b2b7d963f3ee23533bcbea3c6ab7c710766",
    },
    {
        src: "hangar-script.js",
        dest: "spacegame/Content/UIResources/frontend/views/hangar/hangar-script.js",
        md5: "f40edbbeba8e4c94ab5df07c40821de9",
        sha256: "b3290327dfa2c94af87a58aa13b3021706f5685f249edbcd1a34bbb40ff8eede",
    }
];

module.exports = {
    patchLevel,
    dataMapping
}