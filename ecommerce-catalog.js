/* ecommerce-catalog.js
   Single-file Node.js + Express + Mongoose app for E-commerce catalog
   - MongoDB collection: Products
   - Each product has: name, price, category, variants [{color, size, stock}]
   - CRUD: add product, list products, update variant stock, delete product
   - Serves a simple UI at / to view products and add new ones
   Save as `ecommerce-catalog.js` and run:
   npm install express mongoose body-parser
   node ecommerce-catalog.js
*/

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// --- MongoDB connection ---
const DB_URI = "mongodb://127.0.0.1:27017/ecommerceDB"; // change if needed
mongoose.connect(DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(()=>console.log("MongoDB connected"))
.catch(err=>console.error(err));

// --- Mongoose schema ---
const variantSchema = new mongoose.Schema({
  color: { type: String, required: true },
  size: { type: String, required: true },
  stock: { type: Number, required: true, min: 0 }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true },
  variants: [variantSchema]
});

const Product = mongoose.model("Product", productSchema);

// --- Sample products insertion (if collection is empty) ---
async function insertSampleProducts(){
  const count = await Product.countDocuments();
  if(count === 0){
    const sampleProducts = [
      {
        name: "T-Shirt",
        price: 19.99,
        category: "Clothing",
        variants: [
          { color: "Red", size: "M", stock: 10 },
          { color: "Blue", size: "L", stock: 5 }
        ]
      },
      {
        name: "Sneakers",
        price: 49.99,
        category: "Footwear",
        variants: [
          { color: "Black", size: "9", stock: 8 },
          { color: "White", size: "10", stock: 6 }
        ]
      }
    ];
    await Product.insertMany(sampleProducts);
    console.log("Sample products inserted.");
  }
}
insertSampleProducts();

// --- Routes ---
// Home page with simple HTML interface
app.get('/', async (req, res) => {
  const products = await Product.find();
  let html = `<h2>E-commerce Catalog</h2><ul>`;
  products.forEach(p => {
    html += `<li><strong>${p.name}</strong> - $${p.price} (${p.category})<ul>`;
    p.variants.forEach(v => {
      html += `<li>Color: ${v.color}, Size: ${v.size}, Stock: ${v.stock}</li>`;
    });
    html += `</ul></li>`;
  });
  html += `</ul>`;

  html += `
    <h3>Add Product</h3>
    <form method="POST" action="/add">
      Name: <input name="name"><br>
      Price: <input name="price" type="number" step="0.01"><br>
      Category: <input name="category"><br>
      <h4>Variants (JSON Array)</h4>
      <textarea name="variants" rows="4" cols="50">[{"color":"Red","size":"M","stock":10}]</textarea><br>
      <button type="submit">Add Product</button>
    </form>
  `;
  res.send(html);
});

// Add product
app.post('/add', async (req, res) => {
  try {
    const { name, price, category, variants } = req.body;
    let variantsArr = [];
    try { variantsArr = JSON.parse(variants); } catch(e){ return res.send("Invalid JSON for variants"); }
    const product = new Product({ name, price, category, variants: variantsArr });
    await product.save();
    res.redirect('/');
  } catch (err) {
    res.send("Error: "+err.message);
  }
});

// List products (JSON)
app.get('/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// Update variant stock
app.post('/update-stock/:productId', async (req, res) => {
  const { productId } = req.params;
  const { variantIndex, stock } = req.body;
  try {
    const product = await Product.findById(productId);
    if(!product) return res.status(404).json({ error: "Product not found" });
    if(!product.variants[variantIndex]) return res.status(400).json({ error: "Invalid variant index" });
    product.variants[variantIndex].stock = stock;
    await product.save();
    res.json({ ok:true, product });
  } catch(e){ res.status(500).json({ error: e.message }); }
});

// Delete product
app.post('/delete/:productId', async (req,res)=>{
  try{
    await Product.findByIdAndDelete(req.params.productId);
    res.redirect('/');
  } catch(e){ res.status(500).json({ error: e.message }); }
});

// Start server
const PORT = 5000;
app.listen(PORT, ()=>console.log(`E-commerce catalog running at http://localhost:${PORT}`));
