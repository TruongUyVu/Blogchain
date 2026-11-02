// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title BlogChain
 * @notice Blog cơ bản trên blockchain: ai cũng có thể đăng bài,
 *         chỉ tác giả mới được sửa / xóa bài của chính mình.
 * @dev Mục đích học tập. Dữ liệu lưu trên chuỗi tốn gas nên giới hạn độ dài bài viết.
 *      Bài "xóa" chỉ được đánh dấu deleted = true (dữ liệu cũ vẫn nằm trong lịch sử chuỗi).
 */
contract BlogChain {
    // ---------------------------------------------------------------------
    // Dữ liệu
    // ---------------------------------------------------------------------
    struct Post {
        uint256 id;         // chính là chỉ số trong mảng posts
        address author;     // ví của tác giả
        string title;
        string content;
        uint256 createdAt;  // timestamp của block lúc đăng
        uint256 updatedAt;  // timestamp lần sửa gần nhất (bằng createdAt nếu chưa sửa)
        bool deleted;
    }

    uint256 public constant MAX_TITLE_LENGTH = 100;     // tính theo byte
    uint256 public constant MAX_CONTENT_LENGTH = 2000;  // tính theo byte

    Post[] private posts;

    // ---------------------------------------------------------------------
    // Sự kiện (giao diện web sẽ lắng nghe các sự kiện này)
    // ---------------------------------------------------------------------
    event PostCreated(uint256 indexed id, address indexed author, string title, uint256 createdAt);
    event PostEdited(uint256 indexed id, address indexed author, uint256 updatedAt);
    event PostDeleted(uint256 indexed id, address indexed author);

    // ---------------------------------------------------------------------
    // Điều kiện kiểm tra
    // ---------------------------------------------------------------------
    modifier postExists(uint256 id) {
        require(id < posts.length, "Post does not exist");
        _;
    }

    modifier onlyAuthor(uint256 id) {
        require(posts[id].author == msg.sender, "Only the author can do this");
        _;
    }

    modifier validText(string calldata title, string calldata content) {
        uint256 titleLen = bytes(title).length;
        uint256 contentLen = bytes(content).length;
        require(titleLen > 0, "Title is empty");
        require(titleLen <= MAX_TITLE_LENGTH, "Title is too long");
        require(contentLen > 0, "Content is empty");
        require(contentLen <= MAX_CONTENT_LENGTH, "Content is too long");
        _;
    }

    // ---------------------------------------------------------------------
    // Ghi dữ liệu (tốn gas, cần ký bằng MetaMask)
    // ---------------------------------------------------------------------

    /// @notice Đăng bài mới. Trả về id của bài vừa tạo.
    function createPost(string calldata title, string calldata content)
        external
        validText(title, content)
        returns (uint256 id)
    {
        id = posts.length;
        posts.push(
            Post({
                id: id,
                author: msg.sender,
                title: title,
                content: content,
                createdAt: block.timestamp,
                updatedAt: block.timestamp,
                deleted: false
            })
        );
        emit PostCreated(id, msg.sender, title, block.timestamp);
    }

    /// @notice Sửa bài. Chỉ tác giả, và bài chưa bị xóa.
    function editPost(uint256 id, string calldata title, string calldata content)
        external
        postExists(id)
        onlyAuthor(id)
        validText(title, content)
    {
        Post storage p = posts[id];
        require(!p.deleted, "Post is deleted");
        p.title = title;
        p.content = content;
        p.updatedAt = block.timestamp;
        emit PostEdited(id, msg.sender, block.timestamp);
    }

    /// @notice Xóa mềm bài viết. Chỉ tác giả.
    function deletePost(uint256 id) external postExists(id) onlyAuthor(id) {
        Post storage p = posts[id];
        require(!p.deleted, "Post is already deleted");
        p.deleted = true;
        emit PostDeleted(id, msg.sender);
    }

    // ---------------------------------------------------------------------
    // Đọc dữ liệu (miễn phí gas)
    // ---------------------------------------------------------------------

    /// @notice Tổng số bài đã từng đăng (kể cả bài đã xóa mềm).
    function getPostCount() external view returns (uint256) {
        return posts.length;
    }

    /// @notice Lấy một bài theo id. Giao diện nên bỏ qua bài có deleted = true.
    function getPost(uint256 id) external view postExists(id) returns (Post memory) {
        return posts[id];
    }
}
