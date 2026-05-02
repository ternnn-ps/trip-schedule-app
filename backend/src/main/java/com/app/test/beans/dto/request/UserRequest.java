package com.app.test.beans.dto.request;


import lombok.Data;
import lombok.ToString;

import java.util.Date;

@Data
public class UserRequest {

    private Long userId;
    @NotBlank(message = "Username is required")
    private String userName;
    @NotBlank(message = "Full Name is required")
    private String userFullName;
    @NotBlank(message = "E-mail is required")
    private String email;
    private String phone;
    private String website;
    @ToString.Exclude
    private String password;

    private String createdBy;
    private Date createdDate;
    private String updatedBy;
    private Date updatedDate;

    private Character recordStatus;

}
