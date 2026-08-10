function renderCourses() {
  const grid = document.querySelector('#course-grid');
  if (!grid) return;

  const courses = window.COURSES;
  if (!Array.isArray(courses) || courses.length === 0) {
    grid.innerHTML =
      '<p style="grid-column:1/-1;color:#c77b50;font-size:12px">' +
      'Không tải được dữ liệu môn học. Kiểm tra file data/courses.js có được nạp trước assets/js/dashboard.js không.' +
      '</p>';
    return;
  }

  grid.innerHTML = courses
    .map((course) => {
      const isActive = course.status === 'active';
      const action = course.path
        ? `<a href="${course.path}">Xem môn học <span>→</span></a>`
        : `<span class="disabled-link">Xem môn học <span>→</span></span>`;
      const statusPill = isActive
        ? '<span class="status-pill">Đang triển khai</span>'
        : '<span class="status-pill soon">Sắp ra mắt</span>';
      return `
      <article class="course-card ${isActive ? 'is-active' : 'is-soon'}">
        <div class="course-card-top"><span class="course-category">${course.category}</span>${statusPill}</div>
        <div class="course-card-body">
          <span class="course-code">${course.code}</span>
          <h3>${course.name}</h3>
          <p class="course-en">${course.englishName}</p>
        </div>
        <div class="course-card-bottom"><span>${course.weeks} tuần học</span>${action}</div>
      </article>
    `;
    })
    .join('');
}

renderCourses();
</content>
