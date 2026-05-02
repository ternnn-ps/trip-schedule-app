package com.app.test.beans.dto.response;

import lombok.Data;

import java.util.Date;

@Data
public class UserResponse {

    private Long userId;
    private String userName;
    private String userFullName;
    private String email;
    private String phone;
    private String website;

    private String createdBy;
    private Date createdDate;
    private String updatedBy;
    private Date updatedDate;

    private Character recordStatus;

}
