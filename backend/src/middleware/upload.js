const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const uploadDir = process.env.VERCEL
  ? path.join('/tmp', 'uploads', 'docs')
  : path.join(process.cwd(), 'uploads', 'docs');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive:true });
const storage = multer.diskStorage({
  destination:(req,file,cb)=>cb(null,uploadDir),
  filename:(req,file,cb)=>cb(null,Date.now()+'-'+file.originalname.replace(/\s+/g,'_')),
});
module.exports = multer({ storage, limits:{ fileSize:50*1024*1024 } });
