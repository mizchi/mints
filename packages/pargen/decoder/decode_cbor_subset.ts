/*
  cbor subset
  It inculdes only number and number[]
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
	return decodeItem();
}
