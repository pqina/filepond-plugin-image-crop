// @ts-ignore
import { FilePondOptions } from 'filepond';

declare module "filepond" {
  export interface FilePondOptions {
    /** Enable or disable image cropping */
    allowImageCrop?: boolean;
    /** The aspect ratio of the crop in human readable format, for example '1:1' or '16:10' */
    imageCropAspectRatio?: string;
  }
}
