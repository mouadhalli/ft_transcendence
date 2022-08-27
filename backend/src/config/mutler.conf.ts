import { diskStorage } from "multer";
import { HttpException, HttpStatus } from "@nestjs/common";
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { MulterOptions } from "@nestjs/platform-express/multer/interfaces/multer-options.interface";

export const multerOptions: MulterOptions = {
    // file size limits
    // limits: {
    //     fileSize: +process.env.MAX_FILE_SIZE,
    // },
    // Check the mimetypes to allow for upload
    fileFilter: (req: any, file: any, cb: any) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
            // Allow storage of file
            cb(null, true);
        } else {
            // Reject file
            cb(new HttpException(`Unsupported file type ${extname(file.originalname)}`, HttpStatus.BAD_REQUEST), false);
        }
    },
    // Storage properties
    storage: diskStorage({
        // Destination storage path details
        destination: (req: any, file: any, cb: any) => {
            const uploadPath: string = process.env.UPLOAD_LOCATION;
            // Create folder if doesn't exist
            if (!existsSync(uploadPath)) {
                mkdirSync(uploadPath);
            }
            cb(null, uploadPath);
        },
        // File modification details
        filename: (req: any, file: any, cb: any) => {
            //TO DO: remove existing user file

            // Naming file with user id
            cb(null, `${req.user.id}${extname(file.originalname)}`);
        },
    }),
}