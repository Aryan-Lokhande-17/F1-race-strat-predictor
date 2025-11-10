export async function fetchDrivers() {
  const res = await fetch("http://127.0.0.1:8000/driver_list");
  return await res.json();
}
