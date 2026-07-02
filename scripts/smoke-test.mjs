const port = process.env.PORT ?? "3000"
const response = await fetch(`http://127.0.0.1:${port}/api/health`)
if (!response.ok) {
  throw new Error(`health check failed: ${response.status}`)
}
const json = await response.json()
if (!json.ok) throw new Error("health payload did not include ok=true")
console.log("smoke ok")
