// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @dev Phần giao diện của BlogChain mà contract này cần dùng (kiểm tra bài có tồn tại không)
interface IBlogChain {
    function getPostCount() external view returns (uint256);
}

/**
 * @title BlogModeration
 * @notice Kiểm duyệt nội dung cho BlogChain: chủ sở hữu (giảng viên) và các quản trị viên do chủ sở hữu chỉ định
 *         được ẨN bài viết không phù hợp (kèm lý do công khai) và hiện lại khi cần.
 * @dev Mục đích học tập.
 *      - Contract đứng riêng, trỏ tới một contract BlogChain có sẵn: không phải deploy lại blog,
 *        bài cũ giữ nguyên và vẫn kiểm duyệt được.
 *      - "Ẩn" chỉ là đánh dấu để giao diện không hiện nội dung. Dữ liệu bài viết vẫn nằm vĩnh viễn trên
 *        blockchain (đó là bản chất của blockchain), chỉ là trang web không hiển thị nữa.
 *      - Mọi lần ẩn / hiện lại đều phát sự kiện ghi rõ ai làm, lý do gì: việc kiểm duyệt cũng minh bạch.
 */
contract BlogModeration {
    // ---------------------------------------------------------------------
    // Dữ liệu
    // ---------------------------------------------------------------------
    uint256 public constant MAX_REASON_LENGTH = 200; // tính theo byte

    IBlogChain public immutable blog; // contract BlogChain được kiểm duyệt
    address public owner;             // chủ sở hữu: thêm / bớt quản trị viên
    uint256 public hiddenCount;       // số bài đang bị ẩn

    mapping(address => bool) public isModerator;
    mapping(uint256 => bool) private hidden; // id bài → đang bị ẩn

    // ---------------------------------------------------------------------
    // Sự kiện
    // ---------------------------------------------------------------------
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event ModeratorUpdated(address indexed account, bool enabled, address indexed by);
    event PostHidden(uint256 indexed postId, address indexed moderator, string reason, uint256 hiddenAt);
    event PostUnhidden(uint256 indexed postId, address indexed moderator, uint256 unhiddenAt);

    // ---------------------------------------------------------------------
    // Điều kiện kiểm tra
    // ---------------------------------------------------------------------
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can do this");
        _;
    }

    /// @dev Chủ sở hữu luôn có quyền quản trị, không cần nằm trong danh sách
    modifier onlyModerator() {
        require(msg.sender == owner || isModerator[msg.sender], "Only moderators can do this");
        _;
    }

    constructor(address blogAddress) {
        require(blogAddress.code.length > 0, "Blog contract not found");
        blog = IBlogChain(blogAddress);
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ---------------------------------------------------------------------
    // Quản lý quyền (chỉ chủ sở hữu)
    // ---------------------------------------------------------------------

    /// @notice Thêm (enabled = true) hoặc bớt (false) một quản trị viên, ví dụ trợ giảng.
    function setModerator(address account, bool enabled) external onlyOwner {
        require(account != address(0), "Invalid address");
        require(isModerator[account] != enabled, "No change");
        isModerator[account] = enabled;
        emit ModeratorUpdated(account, enabled, msg.sender);
    }

    /// @notice Chuyển quyền chủ sở hữu sang ví khác (ví dụ ví chính của giảng viên).
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ---------------------------------------------------------------------
    // Kiểm duyệt bài viết (chủ sở hữu hoặc quản trị viên)
    // ---------------------------------------------------------------------

    /// @notice Ẩn một bài viết, lý do được ghi công khai.
    function hidePost(uint256 postId, string calldata reason) external onlyModerator {
        require(postId < blog.getPostCount(), "Post does not exist");
        require(!hidden[postId], "Post is already hidden");
        uint256 reasonLen = bytes(reason).length;
        require(reasonLen > 0, "Reason is empty");
        require(reasonLen <= MAX_REASON_LENGTH, "Reason is too long");

        hidden[postId] = true;
        hiddenCount += 1;
        emit PostHidden(postId, msg.sender, reason, block.timestamp);
    }

    /// @notice Hiện lại một bài đã bị ẩn.
    function unhidePost(uint256 postId) external onlyModerator {
        require(hidden[postId], "Post is not hidden");
        hidden[postId] = false;
        hiddenCount -= 1;
        emit PostUnhidden(postId, msg.sender, block.timestamp);
    }

    // ---------------------------------------------------------------------
    // Đọc dữ liệu (miễn phí gas)
    // ---------------------------------------------------------------------

    function isHidden(uint256 postId) external view returns (bool) {
        return hidden[postId];
    }

    /// @notice Trạng thái ẩn của các bài id from, from+1, ..., from+count-1 trong MỘT lần gọi
    ///         (giao diện đọc cả danh sách bài một lượt thay vì hỏi từng bài).
    function getHiddenFlags(uint256 from, uint256 count) external view returns (bool[] memory flags) {
        flags = new bool[](count);
        for (uint256 i = 0; i < count; i++) {
            flags[i] = hidden[from + i];
        }
    }

    /// @notice Ví này có quyền ẩn / hiện bài không (chủ sở hữu hoặc quản trị viên).
    function canModerate(address account) external view returns (bool) {
        return account == owner || isModerator[account];
    }
}
