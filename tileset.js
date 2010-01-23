var tileset = {
	imagesrc: "lofi_1bit_scifi_a.png", width: 136, height: 352,
	tiles: {
		'ul': [5,2], 'u': [6,2], 'ur': [13,2],
		'l' : [5,3],             'r' : [13,3],
		'bl': [5,6], 'b': [6,6], 'br': [13,8],
		'ul-in': [12,8], 'ur-in': [9,6],
		'bl-in': [12,11], 'br-in': [10,11],
		'empty': [0,2],
		'gunk1': [2,35], 'gunk2': [3,35], 'gunk3': [4,35], 'gunk4': [5,35],
		'gunk5': [6,35], 'gunk6': [7,35], 'gunk7': [8,35], 'gunk8': [9,35],
		'gunk9': [10,35], 'gunk10': [11,35],
		'hdoor': [1,19], 'vdoor': [3,19],
		'hdoor-closed': [2,19], 'vdoor-closed': [4,19],

		'player-right': [2,37], 'player-left': [9,37],
		'player-up': [12,37], 'player-down': [4,37],
		'alien-right': [2,39], 'alien-left': [9,39],
		'alien-up': [12,39], 'alien-down': [4,39],
	},
};
tileset.image = new Image(tileset.width, tileset.height);
tileset.image.observe('load', function () { console.log('blah'); });
tileset.image.src = tileset.imagesrc;
