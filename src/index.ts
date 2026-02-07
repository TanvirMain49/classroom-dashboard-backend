import app from "./app";

const PORT = 8000;


app.get('/', (req, res)=>{
  res.send("Welcome to Classroom server")
})

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running at http://localhost:${PORT}`);
});
