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
        sha256: "e7b751a92aca8684f76aba4002c968fbb96b1bc0788308d0a3aa7d95cd1d0026",
    },
    {
        src: "startgame-script.js",
        dest: "spacegame/Content/UIResources/frontend/views/startgame/startgame-script.js",
        md5: "435fa94c604e9da8498f861fed387cae",
        sha256: "bca877a558600e1a1a90933719ab3acb8df208697997d0d379bbb43c3d914881",
    },
    {
        src: "startgame-style.css",
        dest: "spacegame/Content/UIResources/frontend/views/startgame/startgame-style.css",
        md5: "35d7a047452d08cae89feb937ddc2318",
        sha256: "09965ad0449ce29f061adae11cab97a465381faa55ea67f27b6728fb9427d4c5",
    },
    {
        src: "gamemodes-config.js",
        dest: "spacegame/Content/UIResources/frontend/views/gamemodes/gamemodes-config.js",
        md5: "be1f9de63ff72133a885a5c7c3962fbd",
        sha256: "b68e40ef2db3548e937f97833961926febc4570517d4a42a3b2224972dedd06d",
    },
    {
        src: "nsloctext.js",
        dest: "spacegame/Content/UIResources/frontend/data/translations/nsloctext.js",
        md5: "0b93e340ecbe379cabef109b1321e4ce",
        sha256: "cfa99d2522845f89ae5ef8089ca0243a7f7ddd171adab0d8c1e65b8d78581dda",
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
        sha256: "c14ce449a0f6c063467e05ccd9291a8358f628f195b75a907de5fe8fa346a3a1",
    },
    {
        src: "hangar-script.js",
        dest: "spacegame/Content/UIResources/frontend/views/hangar/hangar-script.js",
        md5: "f40edbbeba8e4c94ab5df07c40821de9",
        sha256: "c25a9fa8aa1e2242dd8916d1ba525bb88ce724e3ab93e30fc7aff03c30ade8eb",
    }
];

module.exports = {
    patchLevel,
    dataMapping
}