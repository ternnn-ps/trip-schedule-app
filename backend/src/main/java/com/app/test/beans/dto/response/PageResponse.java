package com.app.test.beans.dto.response;

import lombok.Data;
import java.util.List;

@Data
public class PageResponse<T> {

    private List<T> content;
    private Integer page;
    private Integer size;
    private Long totalElements;
    private Integer totalPages;
}