
const readChunk = require('read-chunk');
const fileType = require('file-type');
const filesSupported = process.env.FILE_TYPES_SUPPORTED ? process.env.FILE_TYPES_SUPPORTED.split(',') :
    ['png', 'jpg', 'jpeg-jpg', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'pdf', 'ods', 'xps-zip', 'tif', 'tiff-tif'];

let fileKyVl = {};

filesSupported.map(el => {
    let split = el.split('-');
    fileKyVl[split[0]] = split[1] ? split[1] : split[0];
});

function toArrayBuffer(buf, length) {
    var ab = new ArrayBuffer(length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < length; ++i) {
        view[i] = buf[i];
    }
    return ab;
}

function getHex(buff, length) {
    const blob = toArrayBuffer(buff, length);
    const uint = new Uint8Array(blob);
    let bytes = [];
    uint.forEach((byte) => {
        bytes.push(byte.toString(16));
    });
    const hex = bytes.join('').toUpperCase();
    return hex;
}

function validateOldMSOffice(options) {
    let len = 8;
    let hex = options.type == 'Binary' ? getHex(readChunk.sync(options.path, 0, len), len) : getHex(options.data, len);
    return hex == 'D0CF11E0A1B11AE1';
}

function fileValidator(options, ext) {
    if (!fileKyVl[ext]) return false;
    if (['doc', 'xls', 'ppt', 'msg'].indexOf(ext) > -1) return validateOldMSOffice(options);

    let buffer = options.type == 'Binary' ? readChunk.sync(options.path, 0, fileType.minimumBytes) : toArrayBuffer(options.data, fileType.minimumBytes);
    let ft = fileType(buffer);
    if (['txt', 'csv'].indexOf(ext) > -1) return (!ft || (ft && !ft.ext));
    if (!ft) return false;
    return ft.ext == fileKyVl[ext];
}

module.exports = fileValidator;