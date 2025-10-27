const bcrypt = require("bcrypt");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const SALT_ROUNDS = 10;
const TEMP_PASSCODE = process.env.TEMP_PASSCODE;

async function createInitialUsers() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials in .env file");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const passcodeHash = await bcrypt.hash(TEMP_PASSCODE, SALT_ROUNDS);

    const users = [];
    for (let i = 1; i <= 9; i++) {
      const username = String(i).padStart(4, "0");
      const name = i === 9 ? "Temporary User" : `User ${i}`;

      users.push({
        username,
        passcode_hash: passcodeHash,
        name,
        is_temp_passcode: true,
        is_active: true,
      });
    }

    const { error } = await supabase.from("users").insert(users).select();

    if (error) {
      console.error("Error creating users:", error.message);
      process.exit(1);
    }
  } catch (error) {
    console.error(" Error:", error.message);
    process.exit(1);
  }
}

createInitialUsers();
