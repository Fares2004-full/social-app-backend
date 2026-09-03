function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) {
    return `${seconds} second`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} day`;
  }
  const months = Math.floor(days / 30);
  return `${months} month`;
}
export default timeAgo;