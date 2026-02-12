import { storage } from "./storage";

export async function seedDatabase() {
  try {
    const existingAdmin = await storage.getUserByEmail("admin@ruangluka.id");
    if (existingAdmin) return;

    const admin = await storage.createUser({
      email: "admin@ruangluka.id",
      username: "admin",
      displayName: "Admin Ruang Luka",
      password: "admin123",
    });
    await storage.updateUserProfile(admin.id, { bio: "Pengelola platform Ruang Luka" });

    const { db } = await import("./db");
    const { users } = await import("../shared/schema");
    const { eq } = await import("drizzle-orm");
    await db.update(users).set({ isAdmin: true, isVerified: true }).where(eq(users.id, admin.id));

    const luna = await storage.createUser({
      email: "luna@example.com",
      username: "luna_healing",
      displayName: "Luna Maharani",
      password: "password123",
    });
    await storage.updateUserProfile(luna.id, { bio: "Berbagi cerita untuk saling menguatkan" });
    await db.update(users).set({ isVerified: true }).where(eq(users.id, luna.id));

    const ardi = await storage.createUser({
      email: "ardi@example.com",
      username: "ardi_stories",
      displayName: "Ardi Pratama",
      password: "password123",
    });
    await storage.updateUserProfile(ardi.id, { bio: "Penulis lepas. Curhat di sini, cerita di sana." });

    const rini = await storage.createUser({
      email: "rini@example.com",
      username: "rini_ceria",
      displayName: "Rini Handayani",
      password: "password123",
    });
    await storage.updateUserProfile(rini.id, { bio: "Selalu berusaha tersenyum walau hati sedang retak" });

    await storage.toggleFollow(luna.id, ardi.id);
    await storage.toggleFollow(ardi.id, luna.id);
    await storage.toggleFollow(rini.id, luna.id);
    await storage.toggleFollow(rini.id, ardi.id);

    const post1 = await storage.createPost(luna.id, {
      content: "Kadang yang paling melelahkan bukan jarak fisiknya, tapi jarak hati yang makin terasa jauh. Kita masih saling sapa, tapi rasanya sudah berbeda. Apakah hanya aku yang merasakan ini?",
      isAnonymous: false,
    });

    const post2 = await storage.createPost(ardi.id, {
      content: "Hari ini aku belajar satu hal: tidak semua orang yang tersenyum itu bahagia. Termasuk aku. Tapi aku tetap mencoba, karena hidup harus terus berjalan.",
      isAnonymous: false,
    });

    const post3 = await storage.createPost(rini.id, {
      content: "Mungkin ini terdengar klise, tapi aku benar-benar merasa sendirian di tengah keramaian. Punya banyak teman tapi tidak punya siapa-siapa untuk cerita. Makanya aku di sini.",
      isAnonymous: false,
    });

    await storage.createPost(luna.id, {
      content: "Kalau kalian sedang merasa lelah, ingat bahwa istirahat itu bukan berarti menyerah. Kita semua butuh waktu untuk menyembuhkan diri sendiri.",
      isAnonymous: false,
    });

    await storage.createPost(ardi.id, {
      content: "Aku tidak tahu apa yang terjadi denganku akhir-akhir ini. Rasanya semua beban dunia ada di pundakku. Tapi terima kasih sudah jadi tempat curhat yang aman.",
      isAnonymous: true,
    });

    await storage.toggleLike(ardi.id, post1.id);
    await storage.toggleLike(rini.id, post1.id);
    await storage.toggleLike(luna.id, post2.id);
    await storage.toggleLike(rini.id, post2.id);
    await storage.toggleLike(luna.id, post3.id);

    await storage.createComment(ardi.id, { postId: post1.id, content: "Kamu tidak sendiri, banyak yang merasakan hal yang sama. Tetap kuat ya!" });
    await storage.createComment(rini.id, { postId: post1.id, content: "Peluk virtual untukmu. Semoga segera menemukan kedamaian." });
    await storage.createComment(luna.id, { postId: post2.id, content: "Ardi, kamu orang yang kuat. Jangan lupa istirahat ya." });
    await storage.createComment(ardi.id, { postId: post3.id, content: "Di sini kita saling mendengarkan. Cerita apa pun, kami siap mendengar." });

    await storage.createAd({
      type: "text",
      title: "Konsultasi Psikolog Online",
      content: "Butuh teman bicara profesional? Konsultasi dengan psikolog berpengalaman mulai dari Rp50.000/sesi.",
      linkUrl: "https://example.com/konsultasi",
      isActive: true,
    });

    await storage.upsertSetting("maintenance_mode", "false");
    await storage.upsertSetting("site_description", "Ruang Luka - Tempat berbagi cerita dan keluh kesah secara anonim maupun terbuka.");

    console.log("Database seeded successfully!");
  } catch (err) {
    console.log("Seed skipped or failed:", err);
  }
}
