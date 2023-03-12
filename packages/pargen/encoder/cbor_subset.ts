/*
  cbor subset
  
  It does not inculde string and float
*/

/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014-2016 Patrick Gansterer <paroga@paroga.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

// const POW_2_24 = 5.960464477539063e-8;
const POW_2_32 = 4294967296;
// const POW_2_53 = 9007199254740992;

export function encode(value: any): ArrayBuffer {
	let data = new ArrayBuffer(256);
	let dataView = new DataView(data);
	let lastLength: number;
	let offset = 0;

	function prepareWrite(length: number): DataView {
		let newByteLength = data.byteLength;
		let requiredLength = offset + length;
		while (newByteLength < requiredLength) newByteLength <<= 1;
		if (newByteLength !== data.byteLength) {
			let oldDataView = dataView;
			data = new ArrayBuffer(newByteLength);
			dataView = new DataView(data);
			let uint32count = (offset + 3) >> 2;
			for (let i = 0; i < uint32count; ++i)
				dataView.setUint32(i << 2, oldDataView.getUint32(i << 2));
		}
		lastLength = length;
		return dataView;
	}

	const commitWrite = () => (offset += lastLength);
	// const writeFloat64 = (value: number) => {
	//   prepareWrite(8).setFloat64(offset, value);
	//   commitWrite();
	// };
	function writeUint8(value: number) {
		prepareWrite(1).setUint8(offset, value);
		commitWrite();
	}
	function writeUint8Array(value: Uint8Array | number[]) {
		let dataView = prepareWrite(value.length);
		for (let i = 0; i < value.length; ++i)
			dataView.setUint8(offset + i, value[i]);
		commitWrite();
	}
	function writeUint16(value: number) {
		prepareWrite(2).setUint16(offset, value);
		commitWrite();
	}
	function writeUint64(value: number) {
		let low = value % POW_2_32;
		let high = (value - low) / POW_2_32;
		let dataView = prepareWrite(8);
		dataView.setUint32(offset, high);
		dataView.setUint32(offset + 4, low);
		commitWrite();
	}

	function writeTypeAndLength(type: any, length: number) {
		if (length < 24) {
			writeUint8((type << 5) | length);
		} else if (length < 0x100) {
			writeUint8((type << 5) | 24);
			writeUint8(length);
		} else if (length < 0x10000) {
			writeUint8((type << 5) | 25);
			writeUint16(length);
		} else {
			writeUint8((type << 5) | 27);
			writeUint64(length);
		}
	}

	function encodeItem(value: any) {
		let i;
		if (value === false) return writeUint8(0xf4);
		if (value === true) return writeUint8(0xf5);
		if (value === null) return writeUint8(0xf6);
		if (value === undefined) return writeUint8(0xf7);
		switch (typeof value) {
			case "number":
				// if (Math.floor(value) === value) {
				//   if (0 <= value && value <= POW_2_53)
				return writeTypeAndLength(0, value);
			// if (-POW_2_53 <= value && value < 0)
			//   return writeTypeAndLength(1, -(value + 1));
			// }
			// writeUint8(0xfb);
			// return writeFloat64(value);
			// case "string":
			//   let utf8data = [];
			//   for (i = 0; i < value.length; ++i) {
			//     let charCode = value.charCodeAt(i);
			//     if (charCode < 0x80) {
			//       utf8data.push(charCode);
			//     } else if (charCode < 0x800) {
			//       utf8data.push(0xc0 | (charCode >> 6));
			//       utf8data.push(0x80 | (charCode & 0x3f));
			//     } else if (charCode < 0xd800) {
			//       utf8data.push(0xe0 | (charCode >> 12));
			//       utf8data.push(0x80 | ((charCode >> 6) & 0x3f));
			//       utf8data.push(0x80 | (charCode & 0x3f));
			//     } else {
			//       charCode = (charCode & 0x3ff) << 10;
			//       charCode |= value.charCodeAt(++i) & 0x3ff;
			//       charCode += 0x10000;
			//       utf8data.push(0xf0 | (charCode >> 18));
			//       utf8data.push(0x80 | ((charCode >> 12) & 0x3f));
			//       utf8data.push(0x80 | ((charCode >> 6) & 0x3f));
			//       utf8data.push(0x80 | (charCode & 0x3f));
			//     }
			//   }

			//   writeTypeAndLength(3, utf8data.length);
			//   return writeUint8Array(utf8data);
			default:
				let length;
				if (Array.isArray(value)) {
					length = value.length;
					writeTypeAndLength(4, length);
					for (i = 0; i < length; ++i) encodeItem(value[i]);
				} else if (value instanceof Uint8Array) {
					writeTypeAndLength(2, value.length);
					writeUint8Array(value);
				} else {
					let keys = Object.keys(value);
					length = keys.length;
					writeTypeAndLength(5, length);
					for (i = 0; i < length; ++i) {
						let key = keys[i];
						encodeItem(key);
						encodeItem(value[key]);
					}
				}
		}
	}

	encodeItem(value);

	if ("slice" in data) return data.slice(0, offset);

	let ret = new ArrayBuffer(offset);
	let retView = new DataView(ret);
	for (let i = 0; i < offset; ++i) retView.setUint8(i, dataView.getUint8(i));
	return ret;
}

export function decode(data: ArrayBuffer) {
	let dataView = new DataView(data);
	let offset = 0;

	const commitRead = (length: number, value: any) => {
		offset += length;
		return value;
	};

	const readArrayBuffer = (length: number) =>
		commitRead(length, new Uint8Array(data, offset, length));
	const readUint8 = () => commitRead(1, dataView.getUint8(offset));
	const readUint16 = () => commitRead(2, dataView.getUint16(offset));
	const readBreak = () => {
		if (dataView.getUint8(offset) !== 0xff) return false;
		offset += 1;
		return true;
	};

	function readLength(additionalInformation: number) {
		if (additionalInformation < 24) return additionalInformation;
		if (additionalInformation === 24) return readUint8();
		if (additionalInformation === 25) return readUint16();
		if (additionalInformation === 31) return -1;
	}
	function readIndefiniteStringLength() {
		let initialByte = readUint8();
		if (initialByte === 0xff) return -1;
		return readLength(initialByte & 0x1f);
	}

	const decodeItem = (): any => {
		let initialByte = readUint8();
		let majorType = initialByte >> 5;
		let additionalInformation = initialByte & 0x1f;
		let i;
		let length;
		length = readLength(additionalInformation);
		if (length < 0 && (majorType < 2 || 6 < majorType)) throw "Invalid length";
		switch (majorType) {
			case 0:
				return length;
			case 1:
				return -1 - length;
			case 2:
				if (length < 0) {
					let elements: any[] = [];
					let fullArrayLength = 0;
					while ((length = readIndefiniteStringLength()) >= 0) {
						fullArrayLength += length;
						elements.push(readArrayBuffer(length));
					}
					let fullArray = new Uint8Array(fullArrayLength);
					let fullArrayOffset = 0;
					for (i = 0; i < elements.length; ++i) {
						fullArray.set(elements[i], fullArrayOffset);
						fullArrayOffset += elements[i].length;
					}
					return fullArray;
				}
				return readArrayBuffer(length);
			case 4:
				let retArray: Array<number>;
				if (length < 0) {
					retArray = [];
					while (!readBreak()) retArray.push(decodeItem());
				} else {
					retArray = new Array(length);
					for (i = 0; i < length; ++i) retArray[i] = decodeItem();
				}
				return retArray;
		}
	};
	let ret = decodeItem();
	if (offset !== data.byteLength) throw "Remaining bytes";
	return ret;
}
