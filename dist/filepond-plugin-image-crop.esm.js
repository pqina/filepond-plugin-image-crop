/*
 * FilePondPluginImageCrop 1.0.3
 * Licensed under MIT, https://opensource.org/licenses/MIT
 * Please visit https://pqina.nl/filepond for details.
 */
// test if file is of type image
const isImage = file => /^image/.test(file.type);

const getAutoCropRect = (originalAspectRatio, targetAspectRatio) => {
  let x, y, width, height;
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
    x,
    y,
    height,
    width
  };
};

const getNumericAspectRatioFromString = aspectRatio => {
  if (typeof aspectRatio === 'string') {
    const [w, h] = aspectRatio.split(':');
    return h / w;
  }
  return aspectRatio;
};

/**
 * Image Auto Crop Plugin
 */
var plugin$1 = _ => {
  const { addFilter, utils } = _;
  const { Type, loadImage, isFile } = utils;

  // subscribe to file transformations
  addFilter(
    'DID_LOAD_ITEM',
    (item, { query }) =>
      new Promise((resolve, reject) => {
        // get file reference
        const file = item.file;

        // if this is not an image we do not have any business cropping it
        if (!isFile(file) || !isImage(file) || !query('GET_ALLOW_IMAGE_CROP')) {
          // continue with the unaltered dataset
          return resolve(item);
        }

        // get the required aspect ratio and exit if it's not set
        const humanAspectRatio = query('GET_IMAGE_CROP_ASPECT_RATIO');
        if (humanAspectRatio === null) {
          return resolve(item);
        }

        // get the required output aspect ratio from the options object
        const cropAspectRatio = getNumericAspectRatioFromString(
          humanAspectRatio
        );

        // get file url
        const url = URL.createObjectURL(file);

        // turn the file into an image
        loadImage(url)
          .then(image => {
            // url is no longer needed
            URL.revokeObjectURL(url);

            let width = image.naturalWidth;
            let height = image.naturalHeight;

            // get exif orientation
            const orientation =
              (item.getMetadata('exif') || {}).orientation || -1;

            // if is rotated incorrectly swap width and height
            // this makes sure the container dimensions ar rendered correctly
            if (orientation >= 5 && orientation <= 8) {
              [width, height] = [height, width];
            }

            // calculate the auto crop rectangle
            // x, y, width and height relative to image size
            const cropRect = getAutoCropRect(height / width, cropAspectRatio);

            // store crop rectangle with item
            item.setMetadata('crop', {
              rect: cropRect,
              aspectRatio: cropAspectRatio
            });

            // done!
            resolve(item);
          })
          .catch(e => {
            // something went wrong when loading the image, probably not supported
            resolve(item);
          });
      })
  );

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

export default plugin$1;
