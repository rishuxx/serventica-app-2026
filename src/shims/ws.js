'use strict';

// React Native uses global WebSocket implementation
module.exports = typeof WebSocket !== 'undefined' ? WebSocket : function() {};
module.exports.WebSocket = module.exports;
module.exports.default = module.exports;
