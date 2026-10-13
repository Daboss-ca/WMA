import "./styles/admin.css";
import { mountAdminApp } from "./index.js";

const root = document.getElementById("admin-root");
if (!root) throw new Error('Missing <div id="admin-root"> in admin.html');

mountAdminApp(root);