export {};
const group = document.querySelector<HTMLElement>('[data-news-filters]');
const buttons = document.querySelectorAll<HTMLButtonElement>('[data-category]');
const articles = document.querySelectorAll<HTMLElement>('[data-news-category]');
const status = document.querySelector<HTMLElement>('[data-news-status]');
if (group) group.hidden = false;
buttons.forEach(button => button.addEventListener('click', () => {
  buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  let count = 0;
  articles.forEach(article => {
    article.hidden = button.dataset.category !== 'Todas' && article.dataset.newsCategory !== button.dataset.category;
    if (!article.hidden) count++;
  });
  if (status) status.textContent = `${count} ${count === 1 ? 'publicación' : 'publicaciones'} en ${button.dataset.category}.`;
}));
