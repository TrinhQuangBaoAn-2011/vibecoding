import * as cheerio from 'cheerio';
import { probeRootFavicon } from './fetcher.js';
import { AppError } from './errors.js';

export const STATUS = Object.freeze({
  PASS: 'pass',
  FAIL: 'fail',
  WARNING: 'warning',
  NOT_APPLICABLE: 'na',
  UNTESTABLE: 'untestable',
});

export const STATUS_LABELS = Object.freeze({
  pass: 'Đạt',
  fail: 'Chưa đạt',
  warning: 'Cần xem xét',
  na: 'Không áp dụng',
  untestable: 'Không thể kiểm tra',
});

const TITLE_IDEAL_MIN = 30;
const TITLE_IDEAL_MAX = 60;
const DESCRIPTION_IDEAL_MIN = 50;
const DESCRIPTION_IDEAL_MAX = 160;

function textLength(value) {
  return Array.from(String(value || '')).length;
}

function truncate(value, max = 600) {
  if (value === null || value === undefined) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function attr(el, name) {
  return el?.attribs?.[name] ?? '';
}

function metaEntries($) {
  const entries = [];
  $('meta').each((_, element) => {
    const key = String(attr(element, 'name') || attr(element, 'property') || attr(element, 'http-equiv') || '')
      .trim()
      .toLowerCase();
    if (!key) return;
    entries.push({
      key,
      content: String(attr(element, 'content') || '').trim(),
      name: attr(element, 'name'),
      property: attr(element, 'property'),
    });
  });
  return entries;
}

function findMeta(entries, keys) {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  return entries.filter((entry) => wanted.has(entry.key));
}

function linkEntries($) {
  const entries = [];
  $('link').each((_, element) => {
    const rel = String(attr(element, 'rel') || '')
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    entries.push({
      rel,
      href: String(attr(element, 'href') || '').trim(),
      type: String(attr(element, 'type') || '').trim(),
    });
  });
  return entries;
}

function resolveHttpUrl(href, baseUrl) {
  if (!href) return null;
  if (/^data:image\//i.test(href)) return href;
  try {
    const resolved = new URL(href, baseUrl);
    return ['http:', 'https:'].includes(resolved.protocol) ? resolved.href : null;
  } catch {
    return null;
  }
}

function makeCriterion({
  id,
  name,
  status,
  points,
  maxPoints,
  value,
  message,
  recommendation,
  details = [],
  shortName,
}) {
  return {
    id,
    name,
    shortName: shortName || name,
    status,
    statusLabel: STATUS_LABELS[status],
    points: Math.max(0, Math.round(points * 100) / 100),
    maxPoints,
    value: truncate(value, 600) || 'Không tìm thấy',
    message,
    recommendation,
    details,
  };
}

function inspectTitle($) {
  const titleElement = $('title').first();
  const title = titleElement.length ? titleElement.text().replace(/\s+/g, ' ').trim() : '';
  const length = textLength(title);

  if (!title) {
    return makeCriterion({
      id: 'title',
      name: 'Thẻ Title',
      status: STATUS.FAIL,
      points: 0,
      maxPoints: 15,
      value: 'Không tìm thấy thẻ <title>',
      message: 'Website chưa có thẻ title hoặc thẻ title không có nội dung. Đây là một trong những yếu tố quan trọng nhất để mô tả trang.',
      recommendation: 'Thêm thẻ <title> trong <head> với tiêu đề 30–60 ký tự, mô tả rõ nội dung trang và thương hiệu.',
      details: [
        { label: 'Trạng thái', value: 'Không tìm thấy thẻ title trong HTML' },
        { label: 'Độ dài khuyến nghị', value: '30–60 ký tự' },
      ],
    });
  }

  if (length >= TITLE_IDEAL_MIN && length <= TITLE_IDEAL_MAX) {
    return makeCriterion({
      id: 'title',
      name: 'Thẻ Title',
      status: STATUS.PASS,
      points: 15,
      maxPoints: 15,
      value: title,
      message: `Đã tìm thấy thẻ title dài ${length} ký tự, nằm trong khoảng khuyến nghị 30–60 ký tự.`,
      recommendation: 'Duy trì tiêu đề ngắn gọn, mô tả đúng nội dung trang và tránh nhồi nhét từ khóa.',
      details: [
        { label: 'Nội dung title', value: title },
        { label: 'Độ dài', value: `${length} ký tự` },
        { label: 'Khuyến nghị', value: '30–60 ký tự' },
      ],
    });
  }

  const tooShort = length < TITLE_IDEAL_MIN;
  return makeCriterion({
    id: 'title',
    name: 'Thẻ Title',
    status: STATUS.WARNING,
    points: 10,
    maxPoints: 15,
    value: title,
    message: `Thẻ title tồn tại nhưng dài ${length} ký tự, ${tooShort ? 'ngắn hơn' : 'dài hơn'} khoảng khuyến nghị 30–60 ký tự.`,
    recommendation: tooShort
      ? 'Bổ sung thông tin mô tả rõ hơn cho tiêu đề, bao gồm lĩnh vực hoặc thương hiệu.'
      : 'Rút gọn tiêu đề để hiển thị đầy đủ hơn trên kết quả tìm kiếm và trình duyệt.',
    details: [
      { label: 'Nội dung title', value: title },
      { label: 'Độ dài', value: `${length} ký tự` },
      { label: 'Khuyến nghị', value: '30–60 ký tự' },
    ],
  });
}

function inspectDescription(entries) {
  const matches = findMeta(entries, ['description']);
  const description = matches[0]?.content || '';
  const length = textLength(description);

  if (!description) {
    return makeCriterion({
      id: 'meta-description',
      name: 'Meta Description',
      status: STATUS.FAIL,
      points: 0,
      maxPoints: 15,
      value: 'Không tìm thấy meta description có nội dung',
      message: 'Website chưa khai báo meta description. Công cụ tìm kiếm có thể tự tạo đoạn mô tả, nhưng nội dung có thể không đúng ý bạn.',
      recommendation: 'Thêm <meta name="description" content="..."> với đoạn mô tả 50–160 ký tự, tóm tắt giá trị chính của trang.',
      details: [
        { label: 'Số thẻ description', value: String(matches.length) },
        { label: 'Độ dài khuyến nghị', value: '50–160 ký tự' },
      ],
    });
  }

  if (length >= DESCRIPTION_IDEAL_MIN && length <= DESCRIPTION_IDEAL_MAX) {
    return makeCriterion({
      id: 'meta-description',
      name: 'Meta Description',
      status: STATUS.PASS,
      points: 15,
      maxPoints: 15,
      value: description,
      message: `Meta description dài ${length} ký tự, nằm trong khoảng khuyến nghị 50–160 ký tự.`,
      recommendation: 'Duy trì mô tả rõ ràng, khác nhau cho từng trang và phản ánh đúng nội dung.',
      details: [
        { label: 'Nội dung mô tả', value: description },
        { label: 'Độ dài', value: `${length} ký tự` },
        { label: 'Khuyến nghị', value: '50–160 ký tự' },
      ],
    });
  }

  const tooShort = length < DESCRIPTION_IDEAL_MIN;
  return makeCriterion({
    id: 'meta-description',
    name: 'Meta Description',
    status: STATUS.WARNING,
    points: 10,
    maxPoints: 15,
    value: description,
    message: `Meta description tồn tại nhưng dài ${length} ký tự, ${tooShort ? 'ngắn hơn' : 'dài hơn'} khoảng khuyến nghị 50–160 ký tự.`,
    recommendation: tooShort
      ? 'Bổ sung thêm thông tin về sản phẩm, dịch vụ hoặc lợi ích chính của trang.'
      : 'Rút gọn mô tả để đoạn trích xuất hiển thị đầy đủ và tập trung hơn.',
    details: [
      { label: 'Nội dung mô tả', value: description },
      { label: 'Độ dài', value: `${length} ký tự` },
      { label: 'Khuyến nghị', value: '50–160 ký tự' },
    ],
  });
}

function inspectViewport(entries) {
  const matches = findMeta(entries, ['viewport']);
  const viewport = matches[0]?.content || '';

  if (!viewport) {
    return makeCriterion({
      id: 'viewport',
      name: 'Thẻ Viewport',
      status: STATUS.FAIL,
      points: 0,
      maxPoints: 10,
      value: 'Không tìm thấy thẻ meta viewport',
      message: 'Website chưa khai báo viewport, nên giao diện có thể hiển thị sai tỷ lệ trên điện thoại và máy tính bảng.',
      recommendation: 'Thêm <meta name="viewport" content="width=device-width, initial-scale=1"> trong <head>.',
      details: [{ label: 'Khuyến nghị', value: 'width=device-width, initial-scale=1' }],
    });
  }

  const valid = /width\s*=\s*device-width/i.test(viewport);
  if (valid) {
    return makeCriterion({
      id: 'viewport',
      name: 'Thẻ Viewport',
      status: STATUS.PASS,
      points: 10,
      maxPoints: 10,
      value: viewport,
      message: 'Website có khai báo viewport với width=device-width, hỗ trợ hiển thị responsive trên thiết bị di động.',
      recommendation: 'Duy trì khai báo viewport và kiểm tra giao diện trên nhiều kích thước màn hình.',
      details: [
        { label: 'Nội dung viewport', value: viewport },
        { label: 'Điều kiện đạt', value: 'Có width=device-width' },
      ],
    });
  }

  return makeCriterion({
    id: 'viewport',
    name: 'Thẻ Viewport',
    status: STATUS.WARNING,
    points: 0,
    maxPoints: 10,
    value: viewport,
    message: 'Có thẻ viewport nhưng chưa khai báo width=device-width, nên khả năng responsive chưa được đảm bảo.',
    recommendation: 'Cập nhật viewport thành "width=device-width, initial-scale=1" để trình duyệt di động hiển thị đúng tỷ lệ.',
    details: [
      { label: 'Nội dung viewport', value: viewport },
      { label: 'Điều kiện đạt', value: 'Có width=device-width' },
    ],
  });
}

async function inspectFavicon($, finalUrl) {
  const links = linkEntries($).filter((link) =>
    link.rel.some((rel) => ['icon', 'apple-touch-icon', 'apple-touch-icon-precomposed'].includes(rel)),
  );

  const validLink = links.find((link) => resolveHttpUrl(link.href, finalUrl));
  if (validLink) {
    const resolved = resolveHttpUrl(validLink.href, finalUrl);
    const isData = resolved?.startsWith('data:');
    return {
      criterion: makeCriterion({
        id: 'favicon',
        name: 'Favicon',
        status: STATUS.PASS,
        points: 5,
        maxPoints: 5,
        value: isData ? 'Favicon nhúng trực tiếp (data URI)' : resolved,
        message: 'Đã phát hiện khai báo favicon trong HTML của website.',
        recommendation: 'Duy trì favicon rõ ràng ở nhiều kích thước và kiểm tra hiển thị trên tab trình duyệt.',
        details: [
          { label: 'Khai báo', value: `<link rel="${validLink.rel.join(' ')}" href="${truncate(validLink.href, 250)}">` },
          { label: 'Đường dẫn', value: isData ? 'Data URI' : resolved },
        ],
      }),
      meta: { declared: true, url: isData ? 'data-uri' : resolved, probe: null },
    };
  }

  if (links.length > 0) {
    const first = links[0];
    return {
      criterion: makeCriterion({
        id: 'favicon',
        name: 'Favicon',
        status: STATUS.WARNING,
        points: 0,
        maxPoints: 5,
        value: first.href || 'Thẻ link favicon không có href',
        message: 'Có thẻ khai báo favicon nhưng đường dẫn không hợp lệ hoặc để trống.',
        recommendation: 'Cập nhật href của favicon thành đường dẫn HTTP/HTTPS hợp lệ hoặc data URI hình ảnh.',
        details: [{ label: 'Khai báo tìm thấy', value: `<link rel="${first.rel.join(' ')}" href="${truncate(first.href, 250)}">` }],
      }),
      meta: { declared: true, url: null, probe: null },
    };
  }

  const probe = await probeRootFavicon(finalUrl);

  if (probe.exists) {
    return {
      criterion: makeCriterion({
        id: 'favicon',
        name: 'Favicon',
        status: STATUS.PASS,
        points: 5,
        maxPoints: 5,
        value: probe.url,
        message: 'Không có khai báo favicon trong HTML, nhưng website có favicon mặc định tại /favicon.ico.',
        recommendation: 'Nên khai báo favicon rõ ràng trong <head> để kiểm soát hình ảnh hiển thị trên trình duyệt.',
        details: [
          { label: 'Phát hiện', value: 'Favicon mặc định tại /favicon.ico' },
          { label: 'Đường dẫn', value: probe.url },
        ],
      }),
      meta: { declared: false, url: probe.url, probe },
    };
  }

  if (probe.checked) {
    return {
      criterion: makeCriterion({
        id: 'favicon',
        name: 'Favicon',
        status: STATUS.FAIL,
        points: 0,
        maxPoints: 5,
        value: 'Không tìm thấy favicon',
        message: 'Không phát hiện khai báo favicon trong HTML và /favicon.ico không trả về hình ảnh hợp lệ.',
        recommendation: 'Thêm <link rel="icon" type="image/png" href="/favicon.png"> trong <head> và đặt tệp favicon trong thư mục gốc.',
        details: [
          { label: 'Khai báo trong HTML', value: 'Không có' },
          { label: 'Kiểm tra /favicon.ico', value: 'Không tìm thấy hình ảnh hợp lệ' },
        ],
      }),
      meta: { declared: false, url: null, probe },
    };
  }

  return {
    criterion: makeCriterion({
      id: 'favicon',
      name: 'Favicon',
      status: STATUS.UNTESTABLE,
      points: 0,
      maxPoints: 5,
      value: 'Chưa xác định được favicon',
      message: 'Không có khai báo favicon trong HTML và chưa thể kiểm tra /favicon.ico do website không phản hồi phù hợp.',
      recommendation: 'Khai báo favicon trực tiếp trong <head> để không phụ thuộc vào tệp favicon mặc định.',
      details: [{ label: 'Lý do', value: `Không thể kiểm tra tệp favicon mặc định (${probe.reason || 'không rõ'})` }],
    }),
    meta: { declared: false, url: null, probe },
  };
}

function inspectH1($) {
  const values = [];
  $('h1').each((_, element) => {
    const value = $(element).text().replace(/\s+/g, ' ').trim();
    if (value) values.push(value);
  });

  if (values.length === 0) {
    return makeCriterion({
      id: 'h1',
      name: 'Tiêu đề H1',
      status: STATUS.FAIL,
      points: 0,
      maxPoints: 10,
      value: 'Không tìm thấy thẻ H1',
      message: 'Website không có tiêu đề H1, hoặc các thẻ H1 đang để trống. Cấu trúc nội dung chính vì vậy chưa rõ ràng.',
      recommendation: 'Thêm một thẻ <h1> chứa tiêu đề chính của trang, mô tả ngắn gọn nội dung mà người dùng sẽ xem.',
      details: [{ label: 'Số thẻ H1', value: '0' }],
    });
  }

  if (values.length === 1) {
    return makeCriterion({
      id: 'h1',
      name: 'Tiêu đề H1',
      status: STATUS.PASS,
      points: 10,
      maxPoints: 10,
      value: values[0],
      message: 'Website có duy nhất một thẻ H1, giúp xác định rõ chủ đề chính của trang.',
      recommendation: 'Duy trì một H1 cho mỗi trang và sử dụng H2, H3 cho các mục con.',
      details: [
        { label: 'Nội dung H1', value: values[0] },
        { label: 'Số thẻ H1', value: '1' },
      ],
    });
  }

  return makeCriterion({
    id: 'h1',
    name: 'Tiêu đề H1',
    status: STATUS.WARNING,
    points: 10,
    maxPoints: 10,
    value: values.slice(0, 3).join(' | '),
    message: `Website có ${values.length} thẻ H1. Việc dùng nhiều H1 có thể làm cấu trúc nội dung kém rõ ràng.`,
    recommendation: 'Giữ một H1 cho tiêu đề chính, chuyển các tiêu đề còn lại sang H2 hoặc H3 theo cấu trúc nội dung.',
    details: [
      { label: 'Số thẻ H1', value: String(values.length) },
      { label: 'Các H1 tìm thấy', value: values.slice(0, 5).join(' | ') },
    ],
  });
}

function inspectImages($, finalUrl) {
  const images = [];
  $('img').each((_, element) => {
    const altValue = attr(element, 'alt');
    const hasAltAttribute = Object.prototype.hasOwnProperty.call(element.attribs || {}, 'alt');
    const alt = String(altValue || '').trim();
    const src = String(attr(element, 'src') || '').trim();
    images.push({ alt, hasAltAttribute, src, valid: Boolean(alt) });
  });

  const total = images.length;
  if (total === 0) {
    return {
      criterion: makeCriterion({
        id: 'image-alt',
        name: 'Thuộc tính Alt của hình ảnh',
        status: STATUS.NOT_APPLICABLE,
        points: 0,
        maxPoints: 10,
        value: 'Trang không có hình ảnh <img>',
        message: 'Trang không chứa thẻ <img> nên tiêu chí này không áp dụng. Điểm tối đa của tiêu chí được loại khỏi mẫu số.',
        recommendation: 'Không cần hành động. Khi thêm hình ảnh, hãy bổ sung thuộc tính alt mô tả nội dung.',
        details: [{ label: 'Số hình ảnh', value: '0' }],
      }),
      meta: { total: 0, withAlt: 0, withoutAlt: 0, emptyAlt: 0, samples: [] },
    };
  }

  const withAlt = images.filter((image) => image.valid).length;
  const withoutAlt = total - withAlt;
  const emptyAlt = images.filter((image) => image.hasAltAttribute && !image.alt).length;
  const ratio = withAlt / total;
  const missingSamples = images
    .filter((image) => !image.valid)
    .slice(0, 5)
    .map((image) => truncate(image.src || '(không có src)', 180));

  let status = STATUS.FAIL;
  let points = 0;
  let message = `Có ${withoutAlt}/${total} hình ảnh chưa có nội dung alt mô tả.`;

  if (ratio === 1) {
    status = STATUS.PASS;
    points = 10;
    message = `Tất cả ${total} hình ảnh đều có thuộc tính alt với nội dung mô tả.`;
  } else if (ratio > 0) {
    status = STATUS.WARNING;
    points = Math.round(ratio * 10 * 100) / 100;
    message = `${withAlt}/${total} hình ảnh có alt mô tả (${Math.round(ratio * 100)}%). Còn ${withoutAlt} hình ảnh chưa có nội dung alt.`;
  }

  return {
    criterion: makeCriterion({
      id: 'image-alt',
      name: 'Thuộc tính Alt của hình ảnh',
      status,
      points,
      maxPoints: 10,
      value: `${withAlt}/${total} hình ảnh có alt mô tả`,
      message,
      recommendation:
        status === STATUS.PASS
          ? 'Duy trì mô tả alt ngắn gọn, đúng nội dung ảnh; dùng alt rỗng cho ảnh trang trí thuần túy.'
          : 'Bổ sung thuộc tính alt mô tả nội dung hoặc chức năng của từng ảnh. Với ảnh trang trí, có thể dùng alt="" kèm aria-hidden="true".',
      details: [
        { label: 'Tổng số hình ảnh', value: String(total) },
        { label: 'Có alt mô tả', value: String(withAlt) },
        { label: 'Thiếu alt mô tả', value: String(withoutAlt) },
        { label: 'Alt rỗng', value: String(emptyAlt) },
        ...(missingSamples.length
          ? [{ label: 'Một số ảnh thiếu alt', value: missingSamples.join(' | ') }]
          : []),
      ],
    }),
    meta: {
      total,
      withAlt,
      withoutAlt,
      emptyAlt,
      ratio: Math.round(ratio * 1000) / 1000,
      samples: missingSamples,
    },
  };
}

function inspectLanguage($) {
  const language = String($('html').attr('lang') || '').trim();
  if (!language) {
    return makeCriterion({
      id: 'language',
      name: 'Khai báo ngôn ngữ',
      status: STATUS.FAIL,
      points: 0,
      maxPoints: 5,
      value: 'Thẻ <html> không có thuộc tính lang',
      message: 'Website chưa khai báo ngôn ngữ trong thuộc tính lang của thẻ <html>.',
      recommendation: 'Thêm thuộc tính lang vào thẻ <html>, ví dụ <html lang="vi"> cho nội dung tiếng Việt.',
      details: [{ label: 'Giá trị lang', value: 'Không có' }],
    });
  }

  const valid = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(language);
  if (valid) {
    return makeCriterion({
      id: 'language',
      name: 'Khai báo ngôn ngữ',
      status: STATUS.PASS,
      points: 5,
      maxPoints: 5,
      value: language,
      message: `Website khai báo ngôn ngữ "${language}" trong thẻ <html>, hỗ trợ trình duyệt và công cụ tìm kiếm hiểu ngôn ngữ nội dung.`,
      recommendation: 'Duy trì mã ngôn ngữ chuẩn theo BCP 47, ví dụ vi, en hoặc vi-VN.',
      details: [{ label: 'Giá trị lang', value: language }],
    });
  }

  return makeCriterion({
    id: 'language',
    name: 'Khai báo ngôn ngữ',
    status: STATUS.WARNING,
    points: 0,
    maxPoints: 5,
    value: language,
    message: `Thuộc tính lang có giá trị "${language}" nhưng chưa đúng định dạng mã ngôn ngữ chuẩn.`,
    recommendation: 'Sử dụng mã ngôn ngữ hợp lệ như "vi", "en" hoặc "vi-VN".',
    details: [{ label: 'Giá trị lang', value: language }],
  });
}

function inspectCanonical($, finalUrl) {
  const links = linkEntries($).filter((link) => link.rel.includes('canonical'));
  if (links.length === 0) {
    return makeCriterion({
      id: 'canonical',
      name: 'Thẻ Canonical',
      status: STATUS.FAIL,
      points: 0,
      maxPoints: 5,
      value: 'Không tìm thấy thẻ canonical',
      message: 'Website chưa khai báo URL canonical, nên có thể khó xác định phiên bản chính của trang khi có nhiều URL tương tự.',
      recommendation: 'Thêm <link rel="canonical" href="https://ten-mien.com/duong-dan-chinh"> trong <head> của trang.',
      details: [{ label: 'Số thẻ canonical', value: '0' }],
    });
  }

  const href = links[0].href;
  const resolved = resolveHttpUrl(href, finalUrl);

  if (!href || !resolved) {
    return makeCriterion({
      id: 'canonical',
      name: 'Thẻ Canonical',
      status: STATUS.WARNING,
      points: 0,
      maxPoints: 5,
      value: href || 'Thẻ canonical không có href',
      message: 'Có thẻ canonical nhưng href trống hoặc không phải URL HTTP/HTTPS hợp lệ.',
      recommendation: 'Đặt href của canonical thành URL tuyệt đối của phiên bản chính, ví dụ https://ten-mien.com/trang.',
      details: [{ label: 'Giá trị href', value: href || 'Không có' }],
    });
  }

  if (links.length > 1) {
    return makeCriterion({
      id: 'canonical',
      name: 'Thẻ Canonical',
      status: STATUS.WARNING,
      points: 5,
      maxPoints: 5,
      value: resolved,
      message: `Website có ${links.length} thẻ canonical. Nhiều canonical có thể gây nhầm lẫn về URL chính.`,
      recommendation: 'Chỉ giữ một thẻ canonical duy nhất cho mỗi trang và dùng URL tuyệt đối.',
      details: [
        { label: 'Số thẻ canonical', value: String(links.length) },
        { label: 'Giá trị đầu tiên', value: resolved },
      ],
    });
  }

  return makeCriterion({
    id: 'canonical',
    name: 'Thẻ Canonical',
    status: STATUS.PASS,
    points: 5,
    maxPoints: 5,
    value: resolved,
    message: 'Website có khai báo canonical hợp lệ, giúp xác định phiên bản chính của trang.',
    recommendation: 'Duy trì canonical trỏ tới URL chính xác và nhất quán với sitemap.',
    details: [
      { label: 'Giá trị canonical', value: resolved },
      { label: 'URL phân tích', value: finalUrl },
    ],
  });
}

function inspectOpenGraph(entries) {
  const targets = [
    { key: 'og:title', label: 'OG Title', nameKey: 'og:title' },
    { key: 'og:description', label: 'OG Description', nameKey: 'og:description' },
    { key: 'og:image', label: 'OG Image', nameKey: 'og:image' },
  ];

  const found = targets.map((target) => {
    const match = entries.find((entry) => entry.key === target.key && entry.content);
    return {
      ...target,
      content: match?.content || '',
      present: Boolean(match?.content),
      points: match?.content ? 5 : 0,
    };
  });

  const presentCount = found.filter((item) => item.present).length;
  const points = presentCount * 5;
  const status =
    presentCount === 3 ? STATUS.PASS : presentCount > 0 ? STATUS.WARNING : STATUS.FAIL;

  const message =
    presentCount === 3
      ? 'Website có đầy đủ OG Title, OG Description và OG Image, hỗ trợ hiển thị thông tin khi chia sẻ lên mạng xã hội.'
      : presentCount === 0
        ? 'Không phát hiện thành phần Open Graph nào. Liên kết có thể hiển thị thiếu tiêu đề, mô tả hoặc hình ảnh khi chia sẻ.'
        : `Có ${presentCount}/3 thành phần Open Graph. Còn thiếu: ${found
            .filter((item) => !item.present)
            .map((item) => item.label)
            .join(', ')}.`;

  return makeCriterion({
    id: 'open-graph',
    name: 'Open Graph',
    status,
    points,
    maxPoints: 15,
    value: `${presentCount}/3 thành phần được khai báo`,
    message,
    recommendation:
      presentCount === 3
        ? 'Duy trì OG Title, OG Description và OG Image phù hợp cho từng trang; kiểm tra lại bằng công cụ chia sẻ của mạng xã hội.'
        : 'Bổ sung các thẻ <meta property="og:..."> còn thiếu trong <head>, đặc biệt là og:title, og:description và og:image có kích thước phù hợp.',
    details: found.map((item) => ({
      label: item.label,
      value: item.present
        ? truncate(item.content, 300)
        : 'Không tìm thấy hoặc nội dung trống',
      status: item.present ? 'pass' : 'fail',
    })),
  });
}

export async function analyzeHtml(page, { onProgress } = {}) {
  onProgress?.('parse', 'Đang phân tích cấu trúc HTML...');
  const $ = cheerio.load(page.html);
  const entries = metaEntries($);

  onProgress?.('check', 'Đang kiểm tra 10 tiêu chí SEO và kỹ thuật...');

  const favicon = await inspectFavicon($, page.finalUrl);
  const images = inspectImages($, page.finalUrl);
  const h1 = inspectH1($);
  const title = inspectTitle($);
  const description = inspectDescription(entries);
  const viewport = inspectViewport(entries);
  const language = inspectLanguage($);
  const canonical = inspectCanonical($, page.finalUrl);
  const openGraph = inspectOpenGraph(entries);

  const httpsCriterion = makeCriterion({
    id: 'https',
    name: 'Giao thức HTTPS',
    status: page.finalUrl.startsWith('https://') ? STATUS.PASS : STATUS.FAIL,
    points: page.finalUrl.startsWith('https://') ? 10 : 0,
    maxPoints: 10,
    value: page.finalUrl.startsWith('https://') ? 'Đang sử dụng HTTPS' : 'Đang sử dụng HTTP',
    message: page.finalUrl.startsWith('https://')
      ? 'Website sử dụng HTTPS, giúp mã hóa dữ liệu trao đổi giữa trình duyệt và máy chủ.'
      : 'Website đang truy cập bằng HTTP, dữ liệu trao đổi không được mã hóa và có thể bị can thiệp.',
    recommendation: page.finalUrl.startsWith('https://')
      ? 'Duy trì chứng chỉ SSL hợp lệ và chuyển hướng toàn bộ lưu lượng HTTP sang HTTPS.'
      : 'Cài chứng chỉ SSL và cấu hình chuyển hướng 301 từ HTTP sang HTTPS cho toàn bộ website.',
    details: [
      { label: 'URL cuối cùng', value: page.finalUrl },
      { label: 'Giao thức', value: new URL(page.finalUrl).protocol.replace(':', '').toUpperCase() },
      ...(page.redirects > 0 ? [{ label: 'Số lần chuyển hướng', value: String(page.redirects) }] : []),
    ],
  });

  const criteria = [
    title,
    description,
    viewport,
    favicon.criterion,
    h1,
    httpsCriterion,
    images.criterion,
    language,
    canonical,
    openGraph,
  ];

  const h1Detail = h1.details.find((detail) => detail.label === 'Số thẻ H1');
  const pageMeta = {
    title: title.status === 'fail' ? '' : truncate(title.value, 200),
    description: description.status === 'fail' ? '' : truncate(description.value, 300),
    viewport: viewport.status === 'fail' ? '' : viewport.value,
    language: language.status === 'fail' ? '' : language.value,
    canonical: canonical.status === 'fail' ? '' : canonical.value,
    h1Count: h1Detail?.value || '0',
    og: openGraph.details,
    images: images.meta,
    favicon: favicon.meta,
    finalUrl: page.finalUrl,
    requestedUrl: page.requestedUrl,
    statusCode: page.statusCode,
    contentType: page.contentType,
    htmlBytes: page.htmlBytes,
    redirects: page.redirects,
    fetchTimeMs: page.fetchTimeMs,
    metaTagCount: $('meta').length,
    scriptCount: $('script').length,
    stylesheetCount: $('link[rel="stylesheet"]').length,
  };

  onProgress?.('score', 'Đang tính điểm và tổng hợp kết quả...');

  return { criteria, page: pageMeta };
}

export function assertAnalyzablePage(page) {
  if (!page?.html || typeof page.html !== 'string') {
    throw new AppError('Không nhận được nội dung HTML hợp lệ để phân tích.', {
      status: 502,
      code: 'INVALID_HTML',
    });
  }
}
