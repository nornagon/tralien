function Monster(type, x, y) {
	this.type = type;
	this.x = x;
	this.y = y;

	game.map.at(x, y).monster = this;

	this.moveTo = function (x, y) {
		if (!walkable(game.map.at(x,y).type)) return;
		game.map.at(this.x, this.y).monster = null;
		game.map.at(x,y).monster = this;
		this.x = x;
		this.y = y;
	};
	this.getDisplayType = function () {
		// TODO
		return this.type + '-right';
	}
}
