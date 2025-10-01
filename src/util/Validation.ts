/**
 * isDefined simply ensures a given input is not
 * null, undefined, an empty string or NaN.
 *
 * @param n to validate
 * @returns if this object exists (boolean)
 */
export default function isDefined<T>(n: T | null | undefined | "" | number): n is T
{
    return typeof n === "number" ? !isNaN(n) : n !== null && n !== undefined && n !== "";
}
