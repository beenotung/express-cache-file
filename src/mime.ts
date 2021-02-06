import { fromFile, fromBuffer } from 'file-type';

const BinaryMimeType = 'application/octet-stream';
const HtmlMimeType = 'text/html';
const TxtMimeType = 'text/plain';

function getMimeType(file: string, buffer: Buffer): Promise<string> {
  return fromBuffer(buffer).then((res) => {
    if (res) return res.mime;

    if (file.match(/\.html$/i)) return HtmlMimeType;
    if (file.match(/\.txt$/i)) return TxtMimeType;

    return fromFile(file).then((res) => res?.mime || BinaryMimeType);
  });
}

export default getMimeType;
