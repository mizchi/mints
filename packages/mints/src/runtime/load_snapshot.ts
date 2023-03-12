import { snapshot } from "../gen/snapshot_b64";
import strings from "../gen/__strings.json";
import { decodeBinary } from "../../../pargen/decoder/decoder";
export function loadSnapshot() {
	return decodeBinary(snapshot, strings);
}
