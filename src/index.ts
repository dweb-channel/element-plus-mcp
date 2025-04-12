import { createServer } from './app';
import dotenv from 'dotenv';

dotenv.config();
const PORT = process.env.PORT || 3000;

createServer().listen(PORT, () => {
  console.log(`🚀 MCP server running at http://localhost:${PORT}`);
});