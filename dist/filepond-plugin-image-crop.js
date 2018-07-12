/*
 * FilePondPluginImageCrop 1.0.3
 * Licensed under MIT, https://opensource.org/licenses/MIT
 * Please visit https://pqina.nl/filepond for details.
 */
(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined'
    ? (module.exports = factory())
    : typeof define === 'function' && define.amd
      ? define(factory)
      : (global.FilePondPluginImageCrop = factory());
})(this, function() {
  'use strict';

  // test if file is of type image
  var isImage = function isImage(file) {
    return /^image/.test(file.type);
  };

  var getAutoCropRect = function getAutoCropRect(
    originalAspectRatio,
    targetAspectRatio
  ) {
    var x = void 0,
      y = void 0,
      width = void 0,
      height = void 0;
    // if input is portrait and required is landscape
    if (originalAspectRatio < targetAspectRatio) {
      // width is portrait width, height is width times outputRatio
      height = 1;
      y = 0;
      width = height / targetAspectRatio * originalAspectRatio;
      x = (1 - width) * 0.5;
    } else {
      // if input is landscape and required is portrait (or is square)
      // height is landscape height, width is height divided by outputRatio
      width = 1;
      x = 0;
      height = width / originalAspectRatio * targetAspectRatio;
      y = (1 - height) * 0.5;
    }

    return {
      x: x,
      y: y,
      height: height,
      width: width
    };
  };

  var asyncGenerator = (function() {
    function AwaitValue(value) {
      this.value = value;
    }

    function AsyncGenerator(gen) {
      var front, back;

      function send(key, arg) {
        return new Promise(function(resolve, reject) {
          var request = {
            key: key,
            arg: arg,
            resolve: resolve,
            reject: reject,
            next: null
          };

          if (back) {
            back = back.next = request;
          } else {
            front = back = request;
            resume(key, arg);
          }
        });
      }

      function resume(key, arg) {
        try {
          var result = gen[key](arg);
          var value = result.value;

          if (value instanceof AwaitValue) {
            Promise.resolve(value.value).then(
              function(arg) {
                resume('next', arg);
              },
              function(arg) {
                resume('throw', arg);
              }
            );
          } else {
            settle(result.done ? 'return' : 'normal', result.value);
          }
        } catch (err) {
          settle('throw', err);
        }
      }

      function settle(type, value) {
        switch (type) {
          case 'return':
            front.resolve({
              value: value,
              done: true
            });
            break;

          case 'throw':
            front.reject(value);
            break;

          default:
            front.resolve({
              value: value,
              done: false
            });
            break;
        }

        front = front.next;

        if (front) {
          resume(front.key, front.arg);
        } else {
          back = null;
        }
      }

      this._invoke = send;

      if (typeof gen.return !== 'function') {
        this.return = undefined;
      }
    }

    if (typeof Symbol === 'function' && Symbol.asyncIterator) {
      AsyncGenerator.prototype[Symbol.asyncIterator] = function() {
        return this;
      };
    }

    AsyncGenerator.prototype.next = function(arg) {
      return this._invoke('next', arg);
    };

    AsyncGenerator.prototype.throw = function(arg) {
      return this._invoke('throw', arg);
    };

    AsyncGenerator.prototype.return = function(arg) {
      return this._invoke('return', arg);
    };

    return {
      wrap: function(fn) {
        return function() {
          return new AsyncGenerator(fn.apply(this, arguments));
        };
      },
      await: function(value) {
        return new AwaitValue(value);
      }
    };
  })();

  var slicedToArray = (function() {
    function sliceIterator(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = undefined;

      try {
        for (
          var _i = arr[Symbol.iterator](), _s;
          !(_n = (_s = _i.next()).done);
          _n = true
        ) {
          _arr.push(_s.value);

          if (i && _arr.length === i) break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i['return']) _i['return']();
        } finally {
          if (_d) throw _e;
        }
      }

      return _arr;
    }

    return function(arr, i) {
      if (Array.isArray(arr)) {
        return arr;
      } else if (Symbol.iterator in Object(arr)) {
        return sliceIterator(arr, i);
      } else {
        throw new TypeError(
          'Invalid attempt to destructure non-iterable instance'
        );
      }
    };
  })();

  var getNumericAspectRatioFromString = function getNumericAspectRatioFromString(
    aspectRatio
  ) {
    if (typeof aspectRatio === 'string') {
      var _aspectRatio$split = aspectRatio.split(':'),
        _aspectRatio$split2 = slicedToArray(_aspectRatio$split, 2),
        w = _aspectRatio$split2[0],
        h = _aspectRatio$split2[1];

      return h / w;
    }
    return aspectRatio;
  };

  /**
   * Image Auto Crop Plugin
   */
  var plugin$1 = function(_) {
    var addFilter = _.addFilter,
      utils = _.utils;
    var Type = utils.Type,
      loadImage = utils.loadImage,
      isFile = utils.isFile;

    // subscribe to file transformations

    addFilter('DID_LOAD_ITEM', function(item, _ref) {
      var query = _ref.query;
      return new Promise(function(resolve, reject) {
        // get file reference
        var file = item.file;

        // if this is not an image we do not have any business cropping it
        if (!isFile(file) || !isImage(file) || !query('GET_ALLOW_IMAGE_CROP')) {
          // continue with the unaltered dataset
          return resolve(item);
        }

        // get the required aspect ratio and exit if it's not set
        var humanAspectRatio = query('GET_IMAGE_CROP_ASPECT_RATIO');
        if (humanAspectRatio === null) {
          return resolve(item);
        }

        // get the required output aspect ratio from the options object
        var cropAspectRatio = getNumericAspectRatioFromString(humanAspectRatio);

        // get file url
        var url = URL.createObjectURL(file);

        // turn the file into an image
        loadImage(url)
          .then(function(image) {
            // url is no longer needed
            URL.revokeObjectURL(url);

            var width = image.naturalWidth;
            var height = image.naturalHeight;

            // get exif orientation
            var orientation =
              (item.getMetadata('exif') || {}).orientation || -1;

            // if is rotated incorrectly swap width and height
            // this makes sure the container dimensions ar rendered correctly
            if (orientation >= 5 && orientation <= 8) {
              var _ref2 = [height, width];
              width = _ref2[0];
              height = _ref2[1];
            }

            // calculate the auto crop rectangle
            // x, y, width and height relative to image size
            var cropRect = getAutoCropRect(height / width, cropAspectRatio);

            // store crop rectangle with item
            item.setMetadata('crop', {
              rect: cropRect,
              aspectRatio: cropAspectRatio
            });

            // done!
            resolve(item);
          })
          .catch(function(e) {
            // something went wrong when loading the image, probably not supported
            resolve(item);
          });
      });
    });

    // Expose plugin options
    return {
      options: {
        // enable or disable image cropping
        allowImageCrop: [true, Type.BOOLEAN],

        // the aspect ratio of the crop ('1:1', '16:9', etc)
        imageCropAspectRatio: [null, Type.STRING]
      }
    };
  };

  if (typeof navigator !== 'undefined' && document) {
    // plugin has loaded
    document.dispatchEvent(
      new CustomEvent('FilePond:pluginloaded', { detail: plugin$1 })
    );
  }

  return plugin$1;
});
