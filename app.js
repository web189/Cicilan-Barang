// ================= DATA =================
let data = JSON.parse(localStorage.getItem("cicilan")) || [];
let isAdmin = false;

// ================= ELEMENTS =================
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const modal = document.getElementById("loginModal");
const btnLoginAksi = document.getElementById("btnLoginAksi");

// ================= RENDER TABLE =================
function renderTable() {
  const container = document.getElementById("dataTable");
  const searchVal = (document.getElementById("searchInput")?.value || "").toLowerCase();

  const filtered = data.filter(item =>
    item.nama.toLowerCase().includes(searchVal)
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
    // Dapatkan index asli dari data[]
    const realIndex = data.indexOf(item);

    const totalBayar = item.pembayaran.reduce((a, b) => a + Number(b.nominal), 0);
    const hargaTotal = Number(item.hargaTotal) || 0;
    const jumlahCicilan = Number(item.jumlahCicilan) || 0;
    const sisaBayar = hargaTotal > 0 ? Math.max(0, hargaTotal - totalBayar) : null;
    const progress = hargaTotal > 0 ? Math.min(100, Math.round((totalBayar / hargaTotal) * 100)) : null;
    const sudahBayar = item.pembayaran.length;
    const sisaCicilan = jumlahCicilan > 0 ? Math.max(0, jumlahCicilan - sudahBayar) : null;

    const progressHTML = progress !== null ? `
      <div class="progress-wrap">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <span class="progress-pct">${progress}%</span>
      </div>
    ` : '';

    const sisaHTML = sisaBayar !== null ? `
      <div class="cicilan-meta-row">
        <span class="meta-item ${sisaBayar === 0 ? 'lunas' : ''}">
          ${sisaBayar === 0 ? '✅ LUNAS' : `Sisa: Rp ${formatRupiah(sisaBayar)}`}
        </span>
        ${sisaCicilan !== null ? `<span class="meta-item">Sisa ${sisaCicilan}x cicilan</span>` : ''}
      </div>
    ` : '';

    const cicPerBulan = (hargaTotal > 0 && jumlahCicilan > 0)
      ? `<span class="meta-item">Rp ${formatRupiah(Math.round(hargaTotal / jumlahCicilan))}/bulan</span>` : '';

    const box = document.createElement("div");
    box.className = "cicilan-item";
    box.innerHTML = `
      <div class="cicilan-header">
        <div class="cicilan-info">
          <div class="cicilan-nama">📦 ${item.nama}</div>
          <div class="cicilan-tgl">Mulai: ${formatTgl(item.mulai)}</div>
        </div>
        <div class="cicilan-actions">
          <button class="btn-icon-sm btn-detail" onclick="showDetail(${realIndex})">🔍</button>
          ${isAdmin ? `<button class="btn-icon-sm btn-hapus" onclick="deleteData(${realIndex})">🗑️</button>` : ''}
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

      ${item.pembayaran.length > 0 ? `
        <div class="pembayaran-list">
          ${item.pembayaran.map((p, i) => `
            <div class="pembayaran-row">
              <span class="pay-num">${i + 1}</span>
              <span class="pay-tgl">${formatTgl(p.tgl)}</span>
              <span class="pay-nominal">Rp ${formatRupiah(p.nominal)}</span>
              ${p.bukti ? `<button class="btn-bukti" onclick="viewImage('${p.bukti}')">📷</button>` : '<span class="no-bukti">-</span>'}
              ${isAdmin ? `<button class="btn-hapus-bayar" onclick="deleteBayar(${realIndex}, ${i})">✕</button>` : ''}
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
  const totalTerbayar = data.reduce((sum, item) =>
    sum + item.pembayaran.reduce((a, b) => a + Number(b.nominal), 0), 0);
  const totalTagihan = data.reduce((sum, item) => sum + (Number(item.hargaTotal) || 0), 0);
  const lunas = data.filter(item => {
    const bayar = item.pembayaran.reduce((a, b) => a + Number(b.nominal), 0);
    return item.hargaTotal > 0 && bayar >= item.hargaTotal;
  }).length;

  row.innerHTML = `
    <div class="summary-card">
      <div class="sum-icon">📦</div>
      <div class="sum-val">${totalItem}</div>
      <div class="sum-label">Total Barang</div>
    </div>
    <div class="summary-card">
      <div class="sum-icon">✅</div>
      <div class="sum-val">${lunas}</div>
      <div class="sum-label">Lunas</div>
    </div>
    <div class="summary-card">
      <div class="sum-icon">💳</div>
      <div class="sum-val">Rp ${formatRupiah(totalTerbayar)}</div>
      <div class="sum-label">Total Terbayar</div>
    </div>
    ${totalTagihan > 0 ? `
    <div class="summary-card">
      <div class="sum-icon">🏷️</div>
      <div class="sum-val">Rp ${formatRupiah(Math.max(0, totalTagihan - totalTerbayar))}</div>
      <div class="sum-label">Sisa Tagihan</div>
    </div>` : ''}
  `;
}

// ================= VIEW IMAGE (modal, bukan popup) =================
function viewImage(src) {
  if (!src) { showToast("⚠️ Bukti tidak tersedia", "error"); return; }
  document.getElementById("imgModalSrc").src = src;
  openModal("imgModal");
}

// ================= SHOW DETAIL (modal) =================
function showDetail(index) {
  const item = data[index];
  if (!item) return;

  const totalBayar = item.pembayaran.reduce((a, b) => a + Number(b.nominal), 0);
  const hargaTotal = Number(item.hargaTotal) || 0;
  const progress = hargaTotal > 0 ? Math.min(100, Math.round((totalBayar / hargaTotal) * 100)) : null;

  document.getElementById("detailTitle").textContent = `📦 ${item.nama}`;

  let html = `
    <div class="detail-info">
      <div class="detail-row"><span>Tanggal Mulai</span><b>${formatTgl(item.mulai)}</b></div>
      ${hargaTotal > 0 ? `<div class="detail-row"><span>Harga Total</span><b>Rp ${formatRupiah(hargaTotal)}</b></div>` : ''}
      ${item.jumlahCicilan > 0 ? `<div class="detail-row"><span>Jumlah Cicilan</span><b>${item.jumlahCicilan}x</b></div>` : ''}
      <div class="detail-row"><span>Total Terbayar</span><b>Rp ${formatRupiah(totalBayar)}</b></div>
      ${hargaTotal > 0 ? `<div class="detail-row"><span>Sisa</span><b class="${totalBayar >= hargaTotal ? 'lunas' : ''}">
        ${totalBayar >= hargaTotal ? '✅ LUNAS' : 'Rp ' + formatRupiah(hargaTotal - totalBayar)}
      </b></div>` : ''}
    </div>
    ${progress !== null ? `
    <div class="progress-wrap" style="margin: 12px 0">
      <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
      <span class="progress-pct">${progress}%</span>
    </div>` : ''}
    <h4 style="margin:16px 0 8px">Riwayat Pembayaran</h4>
  `;

  if (item.pembayaran.length === 0) {
    html += `<div class="no-bayar">Belum ada pembayaran</div>`;
  } else {
    item.pembayaran.forEach((p, i) => {
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

// FIX: gunakan split agar tidak kena timezone offset
function formatTgl(tgl) {
  if (!tgl) return "-";
  // format: YYYY-MM-DD
  const parts = tgl.split("-");
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  }
  const d = new Date(tgl);
  return isNaN(d) ? tgl : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

// ================= MODAL HELPERS =================
function openModal(id) {
  document.getElementById(id).classList.add("show");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("show");
}

// ================= TAMPIL FORM =================
function showForm(type) {
  document.getElementById("formBaru").classList.add("hidden");
  document.getElementById("formBayar").classList.add("hidden");

  if (type === "baru") {
    document.getElementById("formBaru").classList.remove("hidden");
    document.getElementById("formBaru").scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    document.getElementById("formBayar").classList.remove("hidden");
    document.getElementById("formBayar").scrollIntoView({ behavior: "smooth", block: "start" });
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
  // Simpan pilihan sebelumnya jika ada
  const prevVal = select.value;

  select.innerHTML = "";

  if (data.length === 0) {
    select.innerHTML = `<option value="">-- Belum ada barang --</option>`;
    return;
  }

  select.innerHTML = `<option value="">-- Pilih Barang --</option>`;

  data.forEach((item, index) => {
    const totalBayar = item.pembayaran.reduce((a, b) => a + Number(b.nominal), 0);
    const harga = Number(item.hargaTotal) || 0;
    const label = harga > 0
      ? `${item.nama} (sisa Rp ${formatRupiah(Math.max(0, harga - totalBayar))})`
      : item.nama;
    select.innerHTML += `<option value="${index}">${label}</option>`;
  });

  // Kembalikan pilihan sebelumnya jika masih valid
  if (prevVal !== "" && data[Number(prevVal)]) {
    select.value = prevVal;
  }
}

// ================= SIMPAN CICILAN BARU =================
function saveCicilan() {
  const nama = document.getElementById("namaBarangBaru").value.trim();
  const hargaTotal = document.getElementById("hargaTotal").value;
  const jumlahCicilan = document.getElementById("jumlahCicilan").value;
  const mulai = document.getElementById("tglMulaiBaru").value;

  if (!nama) {
    showToast("⚠️ Nama barang wajib diisi!", "error");
    return;
  }
  if (!mulai) {
    showToast("⚠️ Tanggal mulai wajib diisi!", "error");
    return;
  }

  data.push({
    nama,
    hargaTotal: hargaTotal ? Number(hargaTotal) : 0,
    jumlahCicilan: jumlahCicilan ? Number(jumlahCicilan) : 0,
    mulai,
    pembayaran: []
  });

  saveToStorage();
  renderTable();
  clearFormBaru();
  hideForm();
  showToast("✅ Cicilan baru berhasil ditambah!");
}

// ================= SIMPAN PEMBAYARAN =================
function saveBayar() {
  const indexStr = document.getElementById("pilihBarang").value;
  const tgl = document.getElementById("tglBayar").value;
  const nominal = document.getElementById("nominal").value;
  const fileInput = document.getElementById("bukti");
  const file = fileInput.files[0];

  // Validasi
  if (indexStr === "" || indexStr === null || indexStr === undefined) {
    showToast("⚠️ Pilih barang terlebih dahulu!", "error");
    return;
  }
  if (!tgl) {
    showToast("⚠️ Tanggal bayar wajib diisi!", "error");
    return;
  }
  if (!nominal || Number(nominal) <= 0) {
    showToast("⚠️ Nominal pembayaran harus lebih dari 0!", "error");
    return;
  }

  const index = Number(indexStr);

  if (!data[index]) {
    showToast("⚠️ Data barang tidak ditemukan!", "error");
    return;
  }

  // Validasi file jika ada
  if (file) {
    if (!file.type.startsWith("image/")) {
      showToast("⚠️ File harus berupa gambar!", "error");
      fileInput.value = "";
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showToast("⚠️ Ukuran gambar maks 3MB!", "error");
      fileInput.value = "";
      return;
    }

    // Proses dengan gambar
    const reader = new FileReader();
    reader.onload = function () {
      data[index].pembayaran.push({ tgl, nominal: Number(nominal), bukti: reader.result });
      saveToStorage();
      renderTable();
      loadSelectBarang();
      clearFormBayar();
      showToast("✅ Pembayaran berhasil disimpan!");
    };
    reader.onerror = function () {
      showToast("⚠️ Gagal membaca file gambar!", "error");
    };
    reader.readAsDataURL(file);
  } else {
    // Simpan tanpa bukti
    data[index].pembayaran.push({ tgl, nominal: Number(nominal), bukti: null });
    saveToStorage();
    renderTable();
    loadSelectBarang();
    clearFormBayar();
    showToast("✅ Pembayaran tersimpan!");
  }
}

// ================= SAVE TO STORAGE =================
function saveToStorage() {
  try {
    localStorage.setItem("cicilan", JSON.stringify(data));
  } catch (e) {
    showToast("⚠️ Gagal menyimpan data (storage penuh?)", "error");
  }
}

// ================= DELETE CICILAN =================
function deleteData(index) {
  if (!data[index]) return;
  if (!confirm(`Hapus cicilan "${data[index].nama}"? Semua data pembayaran akan hilang.`)) return;
  data.splice(index, 1);
  saveToStorage();
  renderTable();
  // Refresh select jika form bayar sedang terbuka
  if (!document.getElementById("formBayar").classList.contains("hidden")) {
    loadSelectBarang();
  }
  showToast("🗑️ Cicilan dihapus");
}

// ================= DELETE BAYAR =================
function deleteBayar(itemIndex, bayarIndex) {
  if (!data[itemIndex]) return;
  if (!confirm("Hapus data pembayaran ini?")) return;
  data[itemIndex].pembayaran.splice(bayarIndex, 1);
  saveToStorage();
  renderTable();
  // Refresh select jika form bayar sedang terbuka
  if (!document.getElementById("formBayar").classList.contains("hidden")) {
    loadSelectBarang();
  }
  showToast("🗑️ Pembayaran dihapus");
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
    showToast("✅ Login berhasil!");
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
  if (e.target === document.getElementById("loginModal")) closeModal("loginModal");
  if (e.target === document.getElementById("detailModal")) closeModal("detailModal");
  if (e.target === document.getElementById("imgModal")) closeModal("imgModal");
};

// ================= TOAST NOTIFICATION =================
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
  toast._timer = setTimeout(() => toast.classList.remove("show"), 3000);
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
  // Reset select ke pilih default
  const select = document.getElementById("pilihBarang");
  if (select) select.value = "";

  document.getElementById("tglBayar").value = "";
  document.getElementById("nominal").value = "";

  const fileInput = document.getElementById("bukti");
  if (fileInput) fileInput.value = "";

  const img = document.getElementById("previewImg");
  if (img) {
    img.src = "";
    img.style.display = "none";
  }
  const label = document.querySelector(".file-upload-label");
  if (label) label.style.display = "flex";
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {

  renderTable();

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
        // File dibatalkan / dihapus
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
