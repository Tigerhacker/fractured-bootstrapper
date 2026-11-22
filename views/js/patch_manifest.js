const patchLevel = 34;

const dataMapping = [
    {
        src: "Fractured Space.exe",
        dest: "spacegame/Binaries/Win64/Fractured Space.exe",
        md5: "da086f69f2d0951085508fcf475a35a7",
        sha256: "496c2455e24ff3c022b44f3aa34f375d2f01cf5095d4d4f3c9a5cadf5ac7b5c0",
    },
    {
        src: "ClientConfig.json",
        dest: "spacegame/ClientConfig.json",
        md5: "f64b830ffe1d9dc6c553ddcf246dfb99",
        sha256: "0087a651ad5fbb235fa438b8d3a3f47cf2f6b11b3f88c528f82c48ccdc8d4b91",
    },
    {
        src: "startgame-script.js",
        dest: "spacegame/Content/UIResources/frontend/views/startgame/startgame-script.js",
        md5: "26e8ba2459da250bc88626077d4fbc40",
        sha256: "bac58eaa7f06a1b2401e5300e0141739055736bfb66d285e28b0096b83bcc1bb",
    },
    {
        src: "startgame-style.css",
        dest: "spacegame/Content/UIResources/frontend/views/startgame/startgame-style.css",
        md5: "e509d86542e15604ef9dfce07ecf8db6",
        sha256: "49e856f3667e0c22db18a8c864c62ae66f1e1e2940d0efb783955ea6e0460301",
    },
    {
        src: "gamemodes-config.js",
        dest: "spacegame/Content/UIResources/frontend/views/gamemodes/gamemodes-config.js",
        md5: "340ca6e5129e331e3990d6b10345015c",
        sha256: "7d864d2985f05b81cd37199c4150652c4becf9c5cc253f160c2f38d7db7509bd",
    },
    {
        src: "nsloctext.js",
        dest: "spacegame/Content/UIResources/frontend/data/translations/nsloctext.js",
        md5: "b675dee54c669f24093571a322fc98ea",
        sha256: "c1d43e513deb470d763b5d023db9275d3cde6bb689c45f1da110eb14ddd091af",
    },
    {
        src: "BP.pak",
        dest: "spacegame/Content/Paks/BP.pak",
        md5: "14641a1739369176dd70f02c5e0c821a",
        sha256: "e5a029920f06bc07bd4610c931efae28834d54b10f256c08a6cb550a6fea5b48",
    },
    {
        src: "results-script.js",
        dest: "spacegame/Content/UIResources/frontend/views/results/results-script.js",
        md5: "ae49d5328aff3203908db7609c94427f",
        sha256: "ace5e5197f6779efd46531c0f08c6b2b7d963f3ee23533bcbea3c6ab7c710766",
    },
    {
        src: "hangar-script.js",
        dest: "spacegame/Content/UIResources/frontend/views/hangar/hangar-script.js",
        md5: "4f3007a550352f7294fb9c47af3f74a6",
        sha256: "b3290327dfa2c94af87a58aa13b3021706f5685f249edbcd1a34bbb40ff8eede",
    },
    {
        src: "BaseEngine.ini",
        dest: "Engine/Config/BaseEngine.ini",
        md5: "280bf6a1ea48fa3c536a7a3b20cc150c",
        sha256: "047690ae6ce7ba5c0c7a5c8ab5b786050f02f985f3f8958f4d66f85ad1223dd4",
    },
    {
        src: "Makichika_DiscordAvatars_P.pak",
        dest: "spacegame/Content/Paks/Makichika_DiscordAvatars_P.pak",
        sha256: "f2af614ad1feb11c68b0ede267f260cb8f690f88f923009357333ebd195e864e",
        md5: "f5a86b3f159aa522c55ede0a9124e961",
    },
    {
        src: "common.js",
        dest: "spacegame/Content/UIResources/frontend/script/common.js",
        sha256: "42c777e308cbbbb147ad95c9ba84e116f696f8c9c98e800ee1f769a551b37d2c",
        md5: "3c5a29a9445f053648cbaa7e433710f2",
    },
    {
        src: "player.js",
        dest: "spacegame/Content/UIResources/frontend/script/player.js",
        sha256: "8e722a3a5205808fc84cad489c0e9f0c70ccac96bdc43ba58006400429c8ffaa",
        md5: "4721844f148b0e4cde56d65ae6f1e9f1",
    },
    {
        src: "scoreboard.js",
        dest: "spacegame/Content/UIResources/frontend/map/scoreboard.js",
        sha256: "91a4d1342dbee1786421eba7ab138126e599ef5819881ba512f7d77f3d39368b",
        md5: "18ae3ef4b7753fbbeb95af0cb714482d",
    }
];

module.exports = { patchLevel, dataMapping };
