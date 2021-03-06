(function() {
    'use strict';

    angular.module('SocketIoNgService', [])
        .service('socketService', ['$rootScope', '$q', function ($rootScope, $q) {
            // holds the promise of a connected socket
            var deferredConnectedSocket = $q.defer();
            function onConnectedSocket() {
                return deferredConnectedSocket.promise;
            }

            // connects with the server and resolves the promise
            var _socket = io.connect();
            _socket.on('connect', function () {
                deferredConnectedSocket.resolve(_socket);
            });

            /** emits an event to the server with a facultative callback */
            function emit(eventName, data, callback) {
                onConnectedSocket().then(function(socket) {
                    socket.emit(eventName, data, function () {
                        if (callback) {
                            var args = arguments;
                            $rootScope.$apply(function () {
                                callback.apply(socket, args);
                            });
                        }
                    });
                });
            }

            // the socket service
            var socketService = {
                /** listens for a server event */
                on: function (eventName, callback, scope) {
                    var handler = null;
                    onConnectedSocket().then(function(socket) {
                        // ensures the scope has not been destroyed while waiting for a connected socket
                        if (scope) {
                            // includes the callback in the AngularJS digest cycle
                            handler = function() {
                                var args = arguments;
                                $rootScope.$apply(function () {
                                    callback.apply(socket, args);
                                });
                            };

                            socket.on(eventName, handler);
                        }
                    });

                    // stops listening to the event channel at scope destruction
                    scope.$on('$destroy', function() {
                        if (null !== handler) {
                            socket.removeListener(eventName, handler);
                            handler = null;
                        }
                    });
                },

                emit: emit,

                /** emits an event to the server and resolves its callback data in a promise */
                qemit: function (eventName, data) {
                    var deferredData = $q.defer();
                    onConnectedSocket().then(function(socket) {
                        socket.emit(eventName, data, function (responseData) {
                            deferredData.resolve(responseData);
                        });
                    });

                    return deferredData.promise;
                }
            };

            return socketService;
        }]);
}());
