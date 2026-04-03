// ================= DATA =================
let data = [];
let isAdmin = false;

// ================= ELEMENTS =================
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

// ================= FIRESTORE REALTIME LISTENER =================
function loadDataRealtime() {
  db.collection("cicilan")
    .orderBy("createdAt", "desc")
    .onSnapshot(
      (snapshot) => {
        data = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() });
        });
        renderTable();
        renderSummary();
      },
      (err) => {
        console.error("Firestore error:", err);
        showToast("⚠️ Gagal memuat data: " + err.message, "error");
      }
    );
}

// ================= RENDER TABLE =================
function renderTable() {
  const container = document.getElementById("dataTable");
  const searchVal = (document.getElementById("searchInput")?.value || "").toLowerCase();

  const filtered = data.filter(item =>
    (item.nama || "").toLowerCase().includes(searchVal)
  );

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <div class="empty-text">${searchVal ? "Tidak ditemukan" : "Belum ada cicilan"}</div>
        <div class="empty-sub">${searchVal ? "Coba kata kunci lain" : "Login sebagai admin untuk menambah cicilan"}</div>
      </div>
    `;
    renderSummary();
    return;
  }

  container.innerHTML = "";

  filtered.forEach((item) => {
    const docId = item.id;

    const pembayaran = Array.isArray(item.pembayaran) ? item.pembayaran : [];
    const totalBayar = pembayaran.reduce((a, b) => a + Number(b.nominal || 0), 0);
    const hargaTotal = Number(item.hargaTotal) || 0;
    const jumlahCicilan = Number(item.jumlahCicilan) || 0;
    const sisaBayar = hargaTotal > 0 ? Math.max(0, hargaTotal - totalBayar) : null;
    const progress = hargaTotal > 0 ? Math.min(100, Math.round((totalBayar / hargaTotal) * 100)) : null;
    const sudahBayar = pembayaran.length;
    const sisaCicilan = jumlahCicilan > 0 ? Math.max(0, jumlahCicilan - sudahBayar) : null;
    const isLunas = hargaTotal > 0 && totalBayar >= hargaTotal;

    const progressHTML = progress !== null ? `
      <div class="progress-wrap">
        <div class="progress-bar">
          <div class="progress-fill ${isLunas ? 'lunas-fill' : ''}" style="width: ${progress}%"></div>
        </div>
        <span class="progress-pct">${progress}%</span>
      </div>
    ` : '';

    const sisaHTML = sisaBayar !== null ? `
      <div class="cicilan-meta-row">
        <span class="meta-item ${isLunas ? 'lunas' : ''}">
          ${isLunas ? '✅ LUNAS' : `Sisa: Rp ${formatRupiah(sisaBayar)}`}
        </span>
        ${sisaCicilan !== null ? `<span class="meta-item">Sisa ${sisaCicilan}x cicilan</span>` : ''}
      </div>
    ` : '';

    const cicPerBulan = (hargaTotal > 0 && jumlahCicilan > 0)
      ? `<span class="meta-item">Rp ${formatRupiah(Math.round(hargaTotal / jumlahCicilan))}/bulan</span>` : '';

    const box = document.createElement("div");
    box.className = `cicilan-item${isLunas ? ' item-lunas' : ''}`;
    box.innerHTML = `
      <div class="cicilan-header">
        <div class="cicilan-info">
          <div class="cicilan-nama">📦 ${escHtml(item.nama)}</div>
          <div class="cicilan-tgl">Mulai: ${formatTgl(item.mulai)}</div>
        </div>
        <div class="cicilan-actions">
          <button class="btn-icon-sm btn-detail" onclick="showDetail('${docId}')">🔍</button>
          ${isAdmin ? `<button class="btn-icon-sm btn-hapus" onclick="deleteData('${docId}', '${escHtml(item.nama)}')">🗑️</button>` : ''}
        </div>
      </div>

      <div class="cicilan-stats">
        <div class="stat-block">
          <div class="stat-label">Total Bayar</div>
          <div class="stat-val">Rp ${formatRupiah(totalBayar)}</div>
        </div>
        ${hargaTotal > 0 ? `
        <div class="stat-block">
          <div class="stat-label">Harga Total</div>
          <div class="stat-val">Rp ${formatRupiah(hargaTotal)}</div>
        </div>` : ''}
        <div class="stat-block">
          <div class="stat-label">Pembayaran</div>
          <div class="stat-val">${sudahBayar}x ${jumlahCicilan > 0 ? '/ ' + jumlahCicilan + 'x' : ''}</div>
        </div>
      </div>

      ${progressHTML}
      ${sisaHTML}
      ${cicPerBulan ? `<div class="cicilan-meta-row">${cicPerBulan}</div>` : ''}

      ${pembayaran.length > 0 ? `
        <div class="pembayaran-list">
          <div class="pay-header">Riwayat Pembayaran</div>
          ${pembayaran.map((p, i) => `
            <div class="pembayaran-row">
              <span class="pay-num">${i + 1}</span>
              <span class="pay-tgl">${formatTgl(p.tgl)}</span>
              <span class="pay-nominal">Rp ${formatRupiah(p.nominal)}</span>
              ${p.bukti ? `<button class="btn-bukti" onclick="viewImage('${p.bukti}')">📷</button>` : '<span class="no-bukti">-</span>'}
              ${isAdmin ? `<button class="btn-hapus-bayar" onclick="deleteBayar('${docId}', ${i})">✕</button>` : ''}
            </div>
          `).join('')}
        </div>
      ` : `<div class="no-bayar">Belum ada pembayaran</div>`}
    `;

    container.appendChild(box);
  });

  renderSummary();
}

// ================= SUMMARY =================
function renderSummary() {
  const row = document.getElementById("summaryRow");
  if (!row) return;

  const totalItem = data.length;
  const totalTerbayar = data.reduce((sum, item) => {
    const p = Array.isArray(item.pembayaran) ? item.pembayaran : [];
    return sum + p.reduce((a, b) => a + Number(b.nominal || 0), 0);
  }, 0);
  const totalTagihan = data.reduce((sum, item) => sum + (Number(item.hargaTotal) || 0), 0);
  const lunas = data.filter(item => {
    const p = Array.isArray(item.pembayaran) ? item.pembayaran : [];
    const bayar = p.reduce((a, b) => a + Number(b.nominal || 0), 0);
    return item.hargaTotal > 0 && bayar >= item.hargaTotal;
  }).length;
  const sisaTagihan = Math.max(0, totalTagihan - totalTerbayar);

  row.innerHTML = `
    <div class="summary-card sc-blue">
      <div class="sum-icon">📦</div>
      <div class="sum-val">${totalItem}</div>
      <div class="sum-label">Total Barang</div>
    </div>
    <div class="summary-card sc-green">
      <div class="sum-icon">✅</div>
      <div class="sum-val">${lunas}</div>
      <div class="sum-label">Lunas</div>
    </div>
    <div class="summary-card sc-cyan">
      <div class="sum-icon">💳</div>
      <div class="sum-val">Rp ${formatRupiah(totalTerbayar)}</div>
      <div class="sum-label">Total Terbayar</div>
    </div>
    ${totalTagihan > 0 ? `
    <div class="summary-card sc-orange">
      <div class="sum-icon">🏷️</div>
      <div class="sum-val">Rp ${formatRupiah(sisaTagihan)}</div>
      <div class="sum-label">Sisa Tagihan</div>
    </div>` : ''}
  `;
}

// ================= VIEW IMAGE =================
function viewImage(src) {
  if (!src) { showToast("⚠️ Bukti tidak tersedia", "error"); return; }
  document.getElementById("imgModalSrc").src = src;
  openModal("imgModal");
}

// ================= SHOW DETAIL =================
function showDetail(docId) {
  const item = data.find(d => d.id === docId);
  if (!item) return;

  const pembayaran = Array.isArray(item.pembayaran) ? item.pembayaran : [];
  const totalBayar = pembayaran.reduce((a, b) => a + Number(b.nominal || 0), 0);
  const hargaTotal = Number(item.hargaTotal) || 0;
  const progress = hargaTotal > 0 ? Math.min(100, Math.round((totalBayar / hargaTotal) * 100)) : null;
  const isLunas = hargaTotal > 0 && totalBayar >= hargaTotal;

  document.getElementById("detailTitle").textContent = `📦 ${item.nama}`;

  let html = `
    <div class="detail-info">
      <div class="detail-row"><span>Tanggal Mulai</span><b>${formatTgl(item.mulai)}</b></div>
      ${hargaTotal > 0 ? `<div class="detail-row"><span>Harga Total</span><b>Rp ${formatRupiah(hargaTotal)}</b></div>` : ''}
      ${item.jumlahCicilan > 0 ? `<div class="detail-row"><span>Jumlah Cicilan</span><b>${item.jumlahCicilan}x</b></div>` : ''}
      ${item.jumlahCicilan > 0 && hargaTotal > 0 ? `<div class="detail-row"><span>Per Bulan</span><b>Rp ${formatRupiah(Math.round(hargaTotal / item.jumlahCicilan))}</b></div>` : ''}
      <div class="detail-row"><span>Total Terbayar</span><b>Rp ${formatRupiah(totalBayar)}</b></div>
      ${hargaTotal > 0 ? `<div class="detail-row"><span>Status</span><b class="${isLunas ? 'lunas' : ''}">
        ${isLunas ? '✅ LUNAS' : 'Rp ' + formatRupiah(hargaTotal - totalBayar) + ' lagi'}
      </b></div>` : ''}
    </div>
    ${progress !== null ? `
    <div class="progress-wrap" style="margin: 12px 0">
      <div class="progress-bar"><div class="progress-fill ${isLunas ? 'lunas-fill' : ''}" style="width:${progress}%"></div></div>
      <span class="progress-pct">${progress}%</span>
    </div>` : ''}
    <div class="detail-pay-title">Riwayat Pembayaran (${pembayaran.length}x)</div>
  `;

  if (pembayaran.length === 0) {
    html += `<div class="no-bayar">Belum ada pembayaran</div>`;
  } else {
    pembayaran.forEach((p, i) => {
      html += `
        <div class="detail-pay-row">
          <div class="detail-pay-num">${i + 1}</div>
          <div class="detail-pay-info">
            <div class="detail-pay-tgl">${formatTgl(p.tgl)}</div>
            <div class="detail-pay-nom">Rp ${formatRupiah(p.nominal)}</div>
          </div>
          ${p.bukti ? `<img src="${p.bukti}" class="detail-pay-img" onclick="viewImage('${p.bukti}')">` : ''}
        </div>
      `;
    });
  }

  document.getElementById("detailBody").innerHTML = html;
  openModal("detailModal");
}

// ================= FORMAT =================
function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID").format(angka);
}

function formatTgl(tgl) {
  if (!tgl) return "-";
  const parts = tgl.split("-");
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  }
  const d = new Date(tgl);
  return isNaN(d) ? tgl : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function escHtml(str) {
  return String(str || "").replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ================= MODAL HELPERS =================
function openModal(id) {
  document.getElementById(id).classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  document.getElementById(id).classList.remove("show");
  document.body.style.overflow = "";
}

// ================= TAMPIL FORM =================
function showForm(type) {
  document.getElementById("formBaru").classList.add("hidden");
  document.getElementById("formBayar").classList.add("hidden");

  if (type === "baru") {
    document.getElementById("formBaru").classList.remove("hidden");
    setTimeout(() => document.getElementById("formBaru").scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  } else {
    document.getElementById("formBayar").classList.remove("hidden");
    setTimeout(() => document.getElementById("formBayar").scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    loadSelectBarang();
  }
}

function hideForm() {
  document.getElementById("formBaru").classList.add("hidden");
  document.getElementById("formBayar").classList.add("hidden");
}

// ================= LOAD SELECT =================
function loadSelectBarang() {
  const select = document.getElementById("pilihBarang");
  const prevVal = select.value;
  select.innerHTML = "";

  if (data.length === 0) {
    select.innerHTML = `<option value="">-- Belum ada barang --</option>`;
    return;
  }

  select.innerHTML = `<option value="">-- Pilih Barang --</option>`;

  data.forEach((item) => {
    const pembayaran = Array.isArray(item.pembayaran) ? item.pembayaran : [];
    const totalBayar = pembayaran.reduce((a, b) => a + Number(b.nominal || 0), 0);
    const harga = Number(item.hargaTotal) || 0;
    const label = harga > 0
      ? `${item.nama} (sisa Rp ${formatRupiah(Math.max(0, harga - totalBayar))})`
      : item.nama;
    select.innerHTML += `<option value="${item.id}">${label}</option>`;
  });

  if (prevVal && data.find(d => d.id === prevVal)) {
    select.value = prevVal;
  }
}

// ================= SIMPAN CICILAN BARU (Firestore) =================
function saveCicilan() {
  const nama = document.getElementById("namaBarangBaru").value.trim();
  const hargaTotal = document.getElementById("hargaTotal").value;
  const jumlahCicilan = document.getElementById("jumlahCicilan").value;
  const mulai = document.getElementById("tglMulaiBaru").value;

  if (!nama) { showToast("⚠️ Nama barang wajib diisi!", "error"); return; }
  if (!mulai) { showToast("⚠️ Tanggal mulai wajib diisi!", "error"); return; }

  const btnSave = document.querySelector('#formBaru .btn-save');
  btnSave.disabled = true;
  btnSave.textContent = "⏳ Menyimpan...";

  db.collection("cicilan").add({
    nama,
    hargaTotal: hargaTotal ? Number(hargaTotal) : 0,
    jumlahCicilan: jumlahCicilan ? Number(jumlahCicilan) : 0,
    mulai,
    pembayaran: [],
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    clearFormBaru();
    hideForm();
    showToast("✅ Cicilan baru berhasil ditambah!");
  })
  .catch((err) => {
    showToast("❌ Gagal simpan: " + err.message, "error");
  })
  .finally(() => {
    btnSave.disabled = false;
    btnSave.textContent = "💾 Simpan Cicilan";
  });
}

// ================= SIMPAN PEMBAYARAN (Firestore) =================
function saveBayar() {
  const docId = document.getElementById("pilihBarang").value;
  const tgl = document.getElementById("tglBayar").value;
  const nominal = document.getElementById("nominal").value;
  const fileInput = document.getElementById("bukti");
  const file = fileInput.files[0];

  if (!docId) { showToast("⚠️ Pilih barang terlebih dahulu!", "error"); return; }
  if (!tgl) { showToast("⚠️ Tanggal bayar wajib diisi!", "error"); return; }
  if (!nominal || Number(nominal) <= 0) { showToast("⚠️ Nominal pembayaran harus lebih dari 0!", "error"); return; }

  if (file) {
    if (!file.type.startsWith("image/")) { showToast("⚠️ File harus berupa gambar!", "error"); fileInput.value = ""; return; }
    if (file.size > 3 * 1024 * 1024) { showToast("⚠️ Ukuran gambar maks 3MB!", "error"); fileInput.value = ""; return; }
  }

  const btnSave = document.querySelector('#formBayar .btn-save');
  btnSave.disabled = true;
  btnSave.textContent = "⏳ Menyimpan...";

  const doSave = (bukti) => {
    const itemRef = db.collection("cicilan").doc(docId);
    const bayarBaru = { tgl, nominal: Number(nominal), bukti: bukti || null };

    // Use arrayUnion to atomically add to pembayaran array
    itemRef.update({
      pembayaran: firebase.firestore.FieldValue.arrayUnion(bayarBaru)
    })
    .then(() => {
      clearFormBayar();
      hideForm();
      showToast("✅ Pembayaran berhasil disimpan!");
    })
    .catch((err) => {
      showToast("❌ Gagal simpan pembayaran: " + err.message, "error");
    })
    .finally(() => {
      btnSave.disabled = false;
      btnSave.textContent = "💾 Simpan Pembayaran";
    });
  };

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => doSave(e.target.result);
    reader.onerror = () => { showToast("⚠️ Gagal membaca file!", "error"); btnSave.disabled = false; btnSave.textContent = "💾 Simpan Pembayaran"; };
    reader.readAsDataURL(file);
  } else {
    doSave(null);
  }
}

// ================= DELETE CICILAN (Firestore) =================
function deleteData(docId, nama) {
  if (!confirm(`Hapus cicilan "${nama}"? Semua data pembayaran akan hilang.`)) return;

  db.collection("cicilan").doc(docId).delete()
    .then(() => showToast("🗑️ Cicilan dihapus"))
    .catch((err) => showToast("❌ Gagal hapus: " + err.message, "error"));
}

// ================= DELETE BAYAR (Firestore) =================
function deleteBayar(docId, bayarIndex) {
  if (!confirm("Hapus data pembayaran ini?")) return;

  const item = data.find(d => d.id === docId);
  if (!item) return;

  const pembayaran = Array.isArray(item.pembayaran) ? [...item.pembayaran] : [];
  pembayaran.splice(bayarIndex, 1);

  db.collection("cicilan").doc(docId).update({ pembayaran })
    .then(() => showToast("🗑️ Pembayaran dihapus"))
    .catch((err) => showToast("❌ Gagal hapus: " + err.message, "error"));
}

// ================= LOGIN =================
function doLogin() {
  const pass = document.getElementById("password").value;
  if (pass === "admin123") {
    isAdmin = true;
    document.getElementById("formMenu").classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    loginBtn.classList.add("hidden");
    document.getElementById("adminBadge").classList.remove("hidden");
    closeModal("loginModal");
    document.getElementById("password").value = "";
    renderTable();
    showToast("✅ Login berhasil! Selamat datang Admin 👤");
  } else {
    showToast("❌ Password salah!", "error");
    document.getElementById("password").value = "";
    document.getElementById("password").focus();
  }
}

loginBtn.onclick = () => openModal("loginModal");

logoutBtn.onclick = () => {
  isAdmin = false;
  document.getElementById("formMenu").classList.add("hidden");
  hideForm();
  logoutBtn.classList.add("hidden");
  loginBtn.classList.remove("hidden");
  document.getElementById("adminBadge").classList.add("hidden");
  renderTable();
  showToast("👋 Berhasil logout");
};

// Klik luar modal = tutup
window.onclick = (e) => {
  if (e.target.id === "loginModal") closeModal("loginModal");
  if (e.target.id === "detailModal") closeModal("detailModal");
  if (e.target.id === "imgModal") closeModal("imgModal");
};

// ================= TOAST =================
function showToast(msg, type = "success") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 3500);
}

// ================= CLEAR FORM =================
function clearFormBaru() {
  document.getElementById("namaBarangBaru").value = "";
  document.getElementById("hargaTotal").value = "";
  document.getElementById("jumlahCicilan").value = "";
  document.getElementById("tglMulaiBaru").value = "";
  document.getElementById("previewCicilan").style.display = "none";
}

function clearFormBayar() {
  const select = document.getElementById("pilihBarang");
  if (select) select.value = "";
  document.getElementById("tglBayar").value = "";
  document.getElementById("nominal").value = "";
  const fileInput = document.getElementById("bukti");
  if (fileInput) fileInput.value = "";
  const img = document.getElementById("previewImg");
  if (img) { img.src = ""; img.style.display = "none"; }
  const label = document.querySelector(".file-upload-label");
  if (label) label.style.display = "flex";
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {

  // Load data dari Firestore
  loadDataRealtime();

  // Set today as default date
  const today = new Date().toISOString().split("T")[0];
  const tglBayar = document.getElementById("tglBayar");
  const tglMulai = document.getElementById("tglMulaiBaru");
  if (tglBayar) tglBayar.value = today;
  if (tglMulai) tglMulai.value = today;

  // Preview gambar saat pilih file
  const buktiInput = document.getElementById("bukti");
  if (buktiInput) {
    buktiInput.addEventListener("change", function () {
      const file = this.files[0];
      const img = document.getElementById("previewImg");
      const label = document.querySelector(".file-upload-label");

      if (file && file.type.startsWith("image/")) {
        if (file.size > 3 * 1024 * 1024) {
          showToast("⚠️ Ukuran gambar maks 3MB!", "error");
          this.value = "";
          return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target.result;
          img.style.display = "block";
          if (label) label.style.display = "none";
        };
        reader.readAsDataURL(file);
      } else if (file) {
        showToast("⚠️ File harus berupa gambar!", "error");
        this.value = "";
      } else {
        img.src = "";
        img.style.display = "none";
        if (label) label.style.display = "flex";
      }
    });
  }

  // Preview cicilan per bulan
  const hargaInput = document.getElementById("hargaTotal");
  const cicInput = document.getElementById("jumlahCicilan");

  function updatePreview() {
    const harga = Number(hargaInput.value);
    const jumlah = Number(cicInput.value);
    const prev = document.getElementById("previewCicilan");
    const amt = document.getElementById("previewAmount");
    if (harga > 0 && jumlah > 0) {
      prev.style.display = "block";
      amt.textContent = `Rp ${formatRupiah(Math.round(harga / jumlah))}/bulan`;
    } else {
      prev.style.display = "none";
    }
  }

  if (hargaInput) hargaInput.addEventListener("input", updatePreview);
  if (cicInput) cicInput.addEventListener("input", updatePreview);

});