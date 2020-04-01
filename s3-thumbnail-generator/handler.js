/*
 * Original source: https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example-deployment-pkg.html
 * Retrieved on:    2018-01-19
 */

// Dependencies
let AWS = require('aws-sdk');
// let async = require('async');
let util = require('util');
// Enable ImageMagick integration.
// let gm = require('gm').subClass({ imageMagick: true });
let sharp = require('sharp');

// Get reference to S3 client.
const s3 = new AWS.S3();

// Constants
// const MAX_WIDTH = 100;
// const MAX_HEIGHT = 100;
// Width of the thumbnail. Resize will set height automatically to maintain aspect ratio.
const THUMBNAIL_WIDTH = 200;

exports.handler = async (event) => {

    // Read options from the event.
    console.log("Reading options from event:\n", util.inspect(event, { depth: 5 }));

    // Object key may have spaces or unicode non-ASCII characters.
    let srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
    let dstKey = "thumb-" + srcKey;

    // Infer the image type.
    let typeMatch = srcKey.match(/\.([^.]*)$/);
    if (!typeMatch) {
        throw new Error("Could not determine the image type.");
    }
    let imageType = typeMatch[1];
    if (imageType != "jpg" && imageType != "png") {
        throw new Error(`Unsupported image type: ${imageType}`);
    }

    // Download the image from S3 into a buffer.
    console.log("Retrieving image file:", srcKey, '...');

    let imageObject;
    try {
        imageObject = await s3.getObject({
            'Bucket': "sigma-s3-thumb-input",
            'Key': srcKey
        }).promise();
        console.log("Successfully retrieved image file:", srcKey);

    } catch (err) {
        console.log("Failed to retrieve image file:", srcKey, err);
        throw new Error(`Failed to retrieve image file: ${srcKey} due to ${err}`);
    }

    let resizedImageContent;
    try {
        resizedImageContent = await sharp(imageObject.Body)
            .resize(THUMBNAIL_WIDTH)
            .toBuffer(imageType);
        console.log("Successfully resized image");

    } catch (err) {
        console.log("Failed to resize image", err);
        throw new Error(`Failed to resize image due to ${err}`);
    }

    // Stream the transformed image to a different S3 bucket.
    console.log("Uploading the image to the destination bucket...");
    try {
        await s3.putObject({
            "Body": data,
            "Bucket": "sigma-s3-thumb-output",
            "Key": dstKey,
            "ACL": "public-read",
            "Metadata": {
                "Content-Type": contentType
            }
        });
        console.log("Successfully uploaded image:", dstKey);
    } catch (err) {
        console.log("Failed to upload image file:", dstKey, err);
        throw new Error(`Failed to upload image file: ${dstKey} due to ${err}`);
    }

    // Download the image from S3, transform, and upload under new key.
    // async.waterfall([
    //     function download(next) {
    //         // Download the image from S3 into a buffer.
    //         s3.getObject({
    //             'Bucket': "sigma-s3-thumb-input",
    //             'Key': srcKey
    //         }, next);
    //     },
    //     function transform(response, next) {
    //         gm(response.Body).size(function (err, size) {
    //             // Infer the scaling factor to avoid stretching the image unnaturally.
    //             let scalingFactor = Math.min(
    //                 MAX_WIDTH / size.width,
    //                 MAX_HEIGHT / size.height
    //             );
    //             let width = scalingFactor * size.width;
    //             let height = scalingFactor * size.height;

    //             // Transform the image buffer in memory.
    //             this.resize(width, height)
    //                 .toBuffer(imageType, function (err, buffer) {
    //                     if (err) {
    //                         next(err);
    //                     } else {
    //                         next(null, response.ContentType, buffer);
    //                     }
    //                 });
    //         });
    //     },
    //     function upload(contentType, data, next) {
    //         // Stream the transformed image to a different S3 bucket.
    //         s3.putObject({
    //             "Body": data,
    //             "Bucket": "sigma-s3-thumb-output",
    //             "Key": dstKey,
    //             "ACL": "public-read",
    //             "Metadata": {
    //                 "Content-Type": contentType
    //             }
    //         }, next);
    //     }
    // ], function (err) {
    //     let msg;
    //     if (err) {
    //         msg = `Unable to resize sigma-s3-thumb-input/${srcKey} and upload to sigma-s3-thumb-output/${dstKey} due to an error: ${err}`;
    //         console.error(msg);
    //     } else {
    //         msg = `Successfully resized sigma-s3-thumb-input/${srcKey} and uploaded to sigma-s3-thumb-output/${dstKey}`;
    //         console.log(msg);
    //     }
    //     callback(err, msg);
    // }
    // );
};
