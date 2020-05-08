declare module "filepond-plugin-image-crop" {
    const FilePondPluginImageCrop: FilePondPluginImageCropProps;
    export interface FilePondPluginImageCropProps {
        /** Enable or disable image cropping */
        allowImageCrop?: boolean;

        /** The aspect ratio of the crop in human readable format, for example '1:1' or '16:10' */
        imageCropAspectRatio?: string;
    }
    export default FilePondPluginImageCrop;
}