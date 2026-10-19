/* =========================
   TORNAR UMA CONTA ADMINISTRADORA

   A conta precisa existir (crie pelo site antes). No terminal:

     npm run admin -- seu@email.com            → vira admin
     npm run admin -- seu@email.com --remove   → volta a ser cliente

   Mesmo efeito, direto no pgAdmin:
     UPDATE users SET role = 'admin' WHERE email = 'seu@email.com';
========================= */

import { pool } from "../server/db.js";
import { setRole } from "../server/repositories/users.js";

const [email, flag] = process.argv.slice(2);

if (!email || !email.includes("@")) {
    console.log("Uso: npm run admin -- seu@email.com   (ou --remove para tirar o acesso)");
    process.exit(1);
}

const role = flag === "--remove" ? "customer" : "admin";

try {
    const user = await setRole(email, role);

    if (!user) {
        console.log(`Nenhuma conta com o e-mail ${email}. Crie a conta pelo site e rode de novo.`);
        process.exitCode = 1;
    } else if (role === "admin") {
        console.log(`Pronto: ${user.name} (${user.email}) agora é administrador. Abra /admin.html (entre de novo se a página já estava aberta).`);
    } else {
        console.log(`Pronto: ${user.name} (${user.email}) voltou a ser cliente.`);
    }
} catch (error) {
    console.error("Não foi possível alterar a conta:", error.message);
    process.exitCode = 1;
} finally {
    await pool.end();
}
